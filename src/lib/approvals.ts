import { useSyncExternalStore } from "react";

export type Approval = {
  id: string;
  action: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  createdAt: number;
  resolvedAt?: number;
};

const KEY = "manus.approvals.v1";
const EMPTY: Approval[] = [];
const listeners = new Set<() => void>();
let cache: Approval[] | null = null;

function read() {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Approval[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Approval[]) {
  cache = next.slice(0, 100);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApprovals() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function recordApproval(input: Pick<Approval, "id" | "action" | "reason">) {
  if (read().some((approval) => approval.id === input.id)) return;
  write([{ ...input, status: "pending", createdAt: Date.now() }, ...read()]);
}

export function resolveApproval(id: string, status: Exclude<Approval["status"], "pending">) {
  write(read().map((approval) => approval.id === id ? { ...approval, status, resolvedAt: Date.now() } : approval));
}
