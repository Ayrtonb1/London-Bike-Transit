import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initNativeShell } from "./lib/native";

createRoot(document.getElementById("root")!).render(<App />);

// Configure the iOS status bar and dismiss the splash screen once the React
// tree has mounted. No-op on the web build.
void initNativeShell();
