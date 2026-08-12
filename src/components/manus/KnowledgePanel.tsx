import { Input } from "@/components/ui/input";
import { useActiveProjectId } from "@/lib/workspace";
import { useKnowledgeSearch } from "@/lib/knowledge";
import { BookOpen, FileText, Search } from "lucide-react";
import { useState } from "react";

export function KnowledgePanel() {
  const projectId = useActiveProjectId();
  const [query, setQuery] = useState("");
  const results = useKnowledgeSearch(query, projectId);

  return (
    <section aria-label="Project knowledge" className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-background/30 p-2">
      <div className="flex items-center gap-2 px-1 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <BookOpen className="size-3" /> Knowledge
      </div>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          aria-label="Search project knowledge"
          placeholder="Search files and memory…"
          className="h-8 pl-8 text-xs"
        />
      </div>
      {query.trim() && (
        <div className="mt-2 space-y-1.5" aria-live="polite">
          {results.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">No matching context yet.</p>
          ) : results.map((result) => (
            <article key={`${result.kind}-${result.id}`} className="rounded-md border border-border/60 bg-background/40 p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {result.kind === "file" ? <FileText className="size-3 text-accent" /> : <BookOpen className="size-3 text-accent" />}
                <span className="min-w-0 flex-1 truncate">{result.title}</span>
                <span className="text-[10px] text-muted-foreground">{Math.round(result.score * 100)}%</span>
              </div>
              <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-muted-foreground">{result.text}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
