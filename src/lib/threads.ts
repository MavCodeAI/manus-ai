import type { UIMessage } from "ai";
import { useSyncExternalStore } from "react";

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const KEY = "manus.threads.v1";
const EMPTY: Thread[] = [];
const listeners = new Set<() => void>();
let cache: Thread[] | null = null;

function read(): Thread[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Thread[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Thread[]) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && listeners.size === 1) {
    window.addEventListener("storage", onStorage);
  }
  return () => listeners.delete(listener);
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY) return;
  cache = null;
  listeners.forEach((l) => l());
}

export function newThreadId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function useThreads(): Thread[] {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => EMPTY,
  );
}

export function useThread(id: string): Thread | undefined {
  const threads = useThreads();
  return threads.find((t) => t.id === id);
}

export function createThread(id: string, title = "New task"): Thread {
  const existing = read().find((t) => t.id === id);
  if (existing) return existing;
  const thread: Thread = { id, title, updatedAt: Date.now(), messages: [] };
  write([thread, ...read()]);
  return thread;
}

export function saveMessages(id: string, messages: UIMessage[]) {
  const threads = read();
  const index = threads.findIndex((t) => t.id === id);
  const firstUserText = messages
    .find((m) => m.role === "user")
    ?.parts.map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
  const title = firstUserText ? firstUserText.slice(0, 60) : "New task";

  if (index === -1) {
    write([{ id, title, updatedAt: Date.now(), messages }, ...threads]);
    return;
  }
  const next = [...threads];
  next[index] = { ...next[index]!, messages, title, updatedAt: Date.now() };
  write(next);
}

export function deleteThread(id: string) {
  write(read().filter((t) => t.id !== id));
}

export function renameThread(id: string, title: string) {
  write(read().map((t) => (t.id === id ? { ...t, title } : t)));
}