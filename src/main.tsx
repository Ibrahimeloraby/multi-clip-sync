import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeDatabase } from "./lib/db-init";

// Check database schema on startup (non-blocking)
initializeDatabase().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
