import { useSyncExternalStore } from "react";

export type ConnectorDefinition = {
  id: string;
  name: string;
  description: string;
  scopes: string[];
};

export type ConnectorConnection = ConnectorDefinition & { connected: boolean };

export const CONNECTORS: ConnectorDefinition[] = [
  { id: "github", name: "GitHub", description: "Read repositories and prepare approved code changes.", scopes: ["read:repo", "write:branch", "write:pull-request"] },
  { id: "drive", name: "Google Drive", description: "Search project files and create approved documents.", scopes: ["read:files", "write:files"] },
  { id: "mcp", name: "Custom MCP", description: "Connect a scoped external tool server.", scopes: ["read:tools", "write:tools"] },
];

const KEY = "manus.connector-connections.v1";
const listeners = new Set<() => void>();
let cache: Record<string, boolean> | null = null;

function read() {
  if (typeof window === "undefined") return {};
  if (cache) return cache;
  try { cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>; }
  catch { cache = {}; }
  return cache;
}

function write(next: Record<string, boolean>) {
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConnectors(): ConnectorConnection[] {
  const state = useSyncExternalStore(subscribe, read, () => ({}));
  return CONNECTORS.map((connector) => ({ ...connector, connected: state[connector.id] === true }));
}

export function setConnectorConnected(id: string, connected: boolean) {
  write({ ...read(), [id]: connected });
}
