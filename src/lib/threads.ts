import type { UIMessage } from "ai";
import { useSyncExternalStore } from "react";

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  pinned?: boolean;
  projectId?: string;
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

export function createThread(id: string, title = "New task", projectId?: string): Thread {
  const existing = read().find((t) => t.id === id);
  if (existing) {
    if (projectId && !existing.projectId) {
      const updated = { ...existing, projectId, updatedAt: Date.now() };
      write(read().map((thread) => (thread.id === id ? updated : thread)));
      return updated;
    }
    return existing;
  }
  const thread: Thread = { id, title, projectId, updatedAt: Date.now(), messages: [] };
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
export type ThreadStatus = "draft" | "active" | "done";

export function threadStatus(thread: Thread): ThreadStatus {
  if (thread.messages.length === 0) return "draft";
  const last = thread.messages[thread.messages.length - 1];
  return last?.role === "assistant" ? "done" : "active";
}

export function togglePin(id: string) {
  write(read().map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
}

export function duplicateThread(id: string): string | null {
  const source = read().find((t) => t.id === id);
  if (!source) return null;
  const newId = newThreadId();
  write([
    { ...source, id: newId, title: `${source.title} (copy)`, pinned: false, updatedAt: Date.now() },
    ...read(),
  ]);
  return newId;
}

export function clearAllThreads() {
  write([]);
}

export function threadToMarkdown(thread: Thread): string {
  const lines = [`# ${thread.title}`, ""];
  for (const message of thread.messages) {
    lines.push(message.role === "user" ? "## You" : "## Manus");
    for (const part of message.parts) {
      if (part.type === "text") lines.push(part.text, "");
      else if (part.type === "tool-deliver_file") {
        const output = (part as { output?: { filename?: string; content?: string } }).output;
        if (output?.filename) {
          lines.push(`**File: ${output.filename}**`, "```", output.content ?? "", "```", "");
        }
      }
    }
  }
  return lines.join("\n");
}

export function relativeTime(timestamp: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
