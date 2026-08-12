import { useSyncExternalStore } from "react";

export type RunEventKind =
  | "run.created"
  | "run.started"
  | "tool.started"
  | "tool.completed"
  | "approval.required"
  | "approval.resolved"
  | "artifact.created"
  | "run.failed"
  | "run.completed";

export type RunEvent = {
  id: string;
  runId: string;
  kind: RunEventKind;
  label: string;
  detail?: string;
  createdAt: number;
};

const KEY = "manus.run-events.v1";
const EMPTY: RunEvent[] = [];
const listeners = new Set<() => void>();
let cache: RunEvent[] | null = null;

function read() {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as RunEvent[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: RunEvent[]) {
  cache = next.slice(-500);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRunEvents(runId?: string) {
  const events = useSyncExternalStore(subscribe, read, () => EMPTY);
  return runId ? events.filter((event) => event.runId === runId) : events;
}

export function recordRunEvent(input: Omit<RunEvent, "id" | "createdAt">) {
  const event: RunEvent = {
    ...input,
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  write([...read(), event]);
  return event;
}
