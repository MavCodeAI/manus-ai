import { useSyncExternalStore } from "react";

export type WorkspaceFile = {
  id: string;
  filename: string;
  projectId?: string;
  content: string;
  bytes: number;
  createdAt: number;
  updatedAt: number;
};

const KEY = "manus.files.v1";
const EMPTY: WorkspaceFile[] = [];
const listeners = new Set<() => void>();
let cache: WorkspaceFile[] | null = null;

function read() {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as WorkspaceFile[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: WorkspaceFile[]) {
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => listeners.delete(listener);
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY) return;
  cache = null;
  listeners.forEach((listener) => listener());
}

export function useWorkspaceFiles(projectId?: string | null) {
  const files = useSyncExternalStore(subscribe, read, () => EMPTY);
  return projectId ? files.filter((file) => file.projectId === projectId) : files.filter((file) => !file.projectId);
}

export function saveWorkspaceFile(filename: string, content: string, projectId?: string | null) {
  const existing = read().find((file) => file.filename === filename && file.projectId === (projectId ?? undefined));
  const nextFile: WorkspaceFile = {
    id: existing?.id ?? `file-${Math.random().toString(36).slice(2, 10)}`,
    filename,
    projectId: projectId ?? undefined,
    content,
    bytes: content.length,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  write([nextFile, ...read().filter((file) => file.id !== existing?.id)]);
  return nextFile;
}

export function deleteWorkspaceFile(id: string) {
  write(read().filter((file) => file.id !== id));
}
