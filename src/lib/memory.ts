import { useSyncExternalStore } from "react";

export type MemoryItem = { id: string; text: string; projectId?: string; createdAt: number };
const KEY = "manus.memory.v1";
const EMPTY: MemoryItem[] = [];
const listeners = new Set<() => void>();
let cache: MemoryItem[] | null = null;

function read() {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try { const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as MemoryItem[]; cache = Array.isArray(parsed) ? parsed : []; }
  catch { cache = []; }
  return cache;
}
function write(next: MemoryItem[]) {
  cache = next.slice(0, 100);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function useMemory(projectId?: string | null) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return projectId ? items.filter((item) => item.projectId === projectId) : items.filter((item) => !item.projectId);
}
export function addMemory(text: string, projectId?: string | null) {
  const value = text.trim();
  if (!value) return;
  write([{ id: `memory-${Date.now()}`, text: value, projectId: projectId ?? undefined, createdAt: Date.now() }, ...read()]);
}
export function deleteMemory(id: string) { write(read().filter((item) => item.id !== id)); }
