import { useCallback, useEffect, useRef, useState } from "react";
import { AgentStateFrame } from "../types";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketResult {
  state: AgentStateFrame | null;
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
}

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8765";
const RECONNECT_DELAY_MS = 3000;

export function useWebSocket(): UseWebSocketResult {
  const [state, setState] = useState<AgentStateFrame | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    setConnectionStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const frame = JSON.parse(event.data) as AgentStateFrame;
        if (frame.type === "state") {
          setState(frame);
          setLastUpdated(new Date());
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("disconnected");
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { state, connectionStatus, lastUpdated };
}
