"""
APEX.AI — WebSocket server.

Streams the full agent state to connected dashboard clients
every time the orchestrator publishes a new snapshot.

Protocol: server pushes JSON frames; clients are read-only.
Frame schema:
  {
    "type": "state",
    "timestamp": "2024-01-01T12:00:00Z",
    "account": { ... },
    "positions": [ ... ],
    "signals": { "AAPL": { ... }, ... },
    "sentiment": { "AAPL": { ... }, ... },
    "risk": { ... },
    "trades": [ ... ],
    "status": "RUNNING" | "PAUSED" | "ERROR"
  }
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, Optional, Set

import websockets
from loguru import logger
from websockets.server import WebSocketServerProtocol

from agent.config import settings


@dataclass
class AgentState:
    status: str = "INITIALISING"
    account: Dict[str, Any] = None
    positions: list = None
    signals: Dict[str, Any] = None
    sentiment: Dict[str, Any] = None
    trades: list = None
    error: Optional[str] = None

    def __post_init__(self):
        self.account = self.account or {}
        self.positions = self.positions or []
        self.signals = self.signals or {}
        self.sentiment = self.sentiment or {}
        self.trades = self.trades or []


class WebSocketServer:
    """
    Async WebSocket broadcast server.

    Usage:
        server = WebSocketServer()
        asyncio.create_task(server.serve())
        # Later:
        await server.broadcast(state)
    """

    def __init__(self) -> None:
        self._clients: Set[WebSocketServerProtocol] = set()
        self._last_state: Optional[Dict] = None

    # ── Connection handling ───────────────────────────────────────────

    async def _handler(self, ws: WebSocketServerProtocol) -> None:
        client_addr = ws.remote_address
        logger.info("Dashboard client connected: {}", client_addr)
        self._clients.add(ws)

        # Send last known state immediately on connect
        if self._last_state:
            try:
                await ws.send(json.dumps(self._last_state))
            except Exception:
                pass

        try:
            async for _ in ws:
                # Clients are read-only; ignore any incoming messages
                pass
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self._clients.discard(ws)
            logger.info("Dashboard client disconnected: {}", client_addr)

    # ── Broadcasting ──────────────────────────────────────────────────

    async def broadcast(self, state: AgentState) -> None:
        """Serialize *state* and push to all connected clients."""
        frame = {
            "type": "state",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": state.status,
            "account": state.account,
            "positions": state.positions,
            "signals": state.signals,
            "sentiment": state.sentiment,
            "trades": state.trades,
            "error": state.error,
        }
        self._last_state = frame
        payload = json.dumps(frame, default=str)

        if not self._clients:
            return

        dead: Set[WebSocketServerProtocol] = set()
        for ws in list(self._clients):
            try:
                await ws.send(payload)
            except Exception:
                dead.add(ws)
        self._clients -= dead

    async def broadcast_error(self, message: str) -> None:
        frame = {
            "type": "state",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "ERROR",
            "error": message,
        }
        self._last_state = frame
        payload = json.dumps(frame)
        for ws in list(self._clients):
            try:
                await ws.send(payload)
            except Exception:
                self._clients.discard(ws)

    # ── Server lifecycle ──────────────────────────────────────────────

    async def serve(self) -> None:
        """Start the WebSocket server (runs until cancelled)."""
        logger.info(
            "WebSocket server listening on ws://{}:{}",
            settings.ws_host, settings.ws_port,
        )
        async with websockets.serve(
            self._handler,
            settings.ws_host,
            settings.ws_port,
            ping_interval=30,
            ping_timeout=10,
        ):
            await asyncio.Future()  # run forever

    @property
    def client_count(self) -> int:
        return len(self._clients)
