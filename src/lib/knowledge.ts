import { useMemo } from "react";
import { useMemory } from "@/lib/memory";
import { useWorkspaceFiles } from "@/lib/files";

export type KnowledgeResult = {
  id: string;
  kind: "file" | "memory";
  title: string;
  text: string;
  score: number;
  projectId?: string;
};

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9\u0600-\u06ff]+/i).filter((token) => token.length > 2);
}

function score(query: string, text: string) {
  const wanted = [...new Set(tokens(query))];
  const haystack = text.toLowerCase();
  if (wanted.length === 0) return 0;
  const hits = wanted.filter((token) => haystack.includes(token)).length;
  return hits / wanted.length;
}

export function searchKnowledge(query: string, files: ReturnType<typeof useWorkspaceFiles>, memories: ReturnType<typeof useMemory>) {
  const results: KnowledgeResult[] = [
    ...files.map((file) => ({ id: file.id, kind: "file" as const, title: file.filename, text: file.content, score: score(query, `${file.filename} ${file.content}`), projectId: file.projectId })),
    ...memories.map((item) => ({ id: item.id, kind: "memory" as const, title: "Saved memory", text: item.text, score: score(query, item.text), projectId: item.projectId })),
  ];
  return results.filter((result) => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
}

export function useKnowledgeSearch(query: string, projectId?: string | null) {
  const files = useWorkspaceFiles(projectId);
  const memories = useMemory(projectId);
  return useMemo(() => searchKnowledge(query, files, memories), [query, files, memories]);
}
