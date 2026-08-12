import { useSyncExternalStore } from "react";

export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = "manus.projects.v1";
const ACTIVE_KEY = "manus.active-project.v1";
const EMPTY: Project[] = [];
const listeners = new Set<() => void>();
let cache: Project[] | null = null;
let activeCache: string | null | undefined;

function readProjects(): Project[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Project[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function writeProjects(next: Project[]) {
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function readActiveId() {
  if (typeof window === "undefined") return null;
  if (activeCache !== undefined) return activeCache;
  activeCache = window.localStorage.getItem(ACTIVE_KEY);
  return activeCache;
}

function writeActiveId(id: string | null) {
  activeCache = id;
  if (typeof window !== "undefined") {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && listeners.size === 1) {
    window.addEventListener("storage", onStorage);
  }
  return () => listeners.delete(listener);
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY && event.key !== ACTIVE_KEY) return;
  cache = null;
  activeCache = undefined;
  listeners.forEach((listener) => listener());
}

export function newProjectId() {
  return `project-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36).slice(-4)}`;
}

export function useProjects() {
  return useSyncExternalStore(subscribe, readProjects, () => EMPTY);
}

export function useActiveProjectId() {
  return useSyncExternalStore(subscribe, () => readActiveId(), () => null);
}

export function createProject(name: string, description = "") {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const project: Project = {
    id: newProjectId(),
    name: trimmed.slice(0, 80),
    description: description.trim().slice(0, 160),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeProjects([project, ...readProjects()]);
  writeActiveId(project.id);
  return project;
}

export function renameProject(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  writeProjects(readProjects().map((project) => (project.id === id ? { ...project, name: trimmed.slice(0, 80), updatedAt: Date.now() } : project)));
}

export function selectProject(id: string | null) {
  if (id && !readProjects().some((project) => project.id === id)) return;
  writeActiveId(id);
}

export function deleteProject(id: string) {
  writeProjects(readProjects().filter((project) => project.id !== id));
  if (readActiveId() === id) writeActiveId(readProjects()[0]?.id ?? null);
}
