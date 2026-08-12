import manusMark from "@/assets/manus-mark.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearAllThreads,
  createThread,
  deleteThread,
  duplicateThread,
  newThreadId,
  relativeTime,
  renameThread,
  threadStatus,
  threadToMarkdown,
  togglePin,
  useThreads,
  type ThreadStatus,
} from "@/lib/threads";
import { cn } from "@/lib/utils";
import { ConnectorsPanel } from "@/components/manus/ConnectorsPanel";
import { MemoryPanel } from "@/components/manus/MemoryPanel";
import { TaskTemplatesPanel } from "@/components/manus/TaskTemplatesPanel";
import { WorkspaceFiles } from "@/components/manus/WorkspaceFiles";
import { WorkspaceSwitcher } from "@/components/manus/WorkspaceSwitcher";
import { useActiveProjectId } from "@/lib/workspace";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  PanelLeftClose,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const FILTERS: { id: "all" | ThreadStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Running" },
  { id: "done", label: "Done" },
  { id: "draft", label: "Drafts" },
];

const statusDot: Record<ThreadStatus, string> = {
  active: "bg-accent animate-pulse",
  done: "bg-emerald-500",
  draft: "bg-muted-foreground/40",
};

export function ThreadSidebar({
  activeId,
  onClose,
}: {
  activeId?: string | undefined;
  onClose?: (() => void) | undefined;
}) {
  const threads = useThreads();
  const activeProjectId = useActiveProjectId();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ThreadStatus>("all");

  const commitRename = () => {
    if (editingId && draft.trim()) renameThread(editingId, draft.trim().slice(0, 60));
    setEditingId(null);
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return threads
      .filter((thread) => {
        if (activeProjectId && thread.projectId !== activeProjectId) return false;
        if (!activeProjectId && thread.projectId) return false;
        if (filter !== "all" && threadStatus(thread) !== filter) return false;
        if (!needle) return true;
        if (thread.title.toLowerCase().includes(needle)) return true;
        return thread.messages.some((message) =>
          message.parts.some(
            (part) => part.type === "text" && part.text.toLowerCase().includes(needle),
          ),
        );
      })
      .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || b.updatedAt - a.updatedAt);
  }, [threads, activeProjectId, query, filter]);

  const startNew = () => {
    const id = newThreadId();
    createThread(id, "New task");
    onClose?.();
    navigate({ to: "/$threadId", params: { threadId: id } });
  };

  const exportThread = (id: string) => {
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;
    const blob = new Blob([threadToMarkdown(thread)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${thread.title.replace(/[^\w\s-]/g, "").slice(0, 40) || "task"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside aria-label="Task navigation" className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <img src={manusMark} alt="Manus" width={28} height={28} className="size-7" />
        <div className="min-w-0">
          <span className="text-display text-xl">Manus</span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Local workspace</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" className="ml-auto lg:hidden" title="Close task navigation" onClick={onClose}>
            <PanelLeftClose />
          </Button>
        )}
      </div>

      <WorkspaceSwitcher />
      <WorkspaceFiles />
      <ConnectorsPanel />
      <MemoryPanel />
      <TaskTemplatesPanel />

      <div className="mt-2 px-3">
        <Button className="w-full justify-start gap-2" variant="secondary" onClick={startNew}>
          <Plus /> New task
        </Button>
      </div>

      <div className="relative mt-3 px-3">
        <Search className="pointer-events-none absolute left-5.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="h-9 pl-8"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 px-3">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={cn(
              "rounded-full border border-border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              filter === option.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <nav aria-label="Tasks" className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-6">
        <p className="flex items-center px-2 py-2 text-xs uppercase tracking-widest text-muted-foreground">
          Tasks <span className="ml-auto normal-case tracking-normal">{visible.length}</span>
        </p>
        {visible.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">
            {threads.length === 0 ? "No tasks yet." : "Nothing matches that filter."}
          </p>
        )}
        {visible.map((thread) => {
          const status = threadStatus(thread);
          return (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-1 transition-colors",
                thread.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
              )}
            >
              {editingId === thread.id ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.currentTarget.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded-md bg-background px-2 py-1.5 text-sm outline-none ring-1 ring-ring"
                  />
                  <button
                    aria-label="Save name"
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={commitRename}
                  >
                    <Check className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/$threadId"
                    params={{ threadId: thread.id }}
                    onClick={() => onClose?.()}
                    className="min-w-0 flex-1 px-2 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("size-1.5 shrink-0 rounded-full", statusDot[status])} />
                      <span className="truncate text-sm text-sidebar-foreground">
                        {thread.title}
                      </span>
                      {thread.pinned && <Pin className="size-3 shrink-0 text-accent" />}
                    </span>
                    <span className="ml-3.5 block text-xs text-muted-foreground">
                      {relativeTime(thread.updatedAt)}
                    </span>
                  </Link>
                  <div className="flex shrink-0 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                    <button
                      aria-label={thread.pinned ? "Unpin task" : "Pin task"}
                      title={thread.pinned ? "Unpin task" : "Pin task"}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-accent"
                      onClick={() => togglePin(thread.id)}
                    >
                      <Pin className="size-4" />
                    </button>
                    <button
                      aria-label="Rename task"
                      title="Rename task"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingId(thread.id);
                        setDraft(thread.title);
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      aria-label="Duplicate task"
                      title="Duplicate task"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const id = duplicateThread(thread.id);
                        if (id) navigate({ to: "/$threadId", params: { threadId: id } });
                      }}
                    >
                      <Copy className="size-4" />
                    </button>
                    <button
                      aria-label="Export task as markdown"
                      title="Export task as Markdown"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => exportThread(thread.id)}
                    >
                      <Download className="size-4" />
                    </button>
                    <button
                      aria-label="Delete task"
                      title="Delete task"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (!window.confirm(`Delete “${thread.title}”? This cannot be undone.`)) return;
                        deleteThread(thread.id);
                        if (thread.id === activeId) navigate({ to: "/" });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-2 text-[11px] leading-4 text-muted-foreground">
        Tasks are stored in this browser. Export important work before clearing data.
      </div>

      {threads.length > 0 && (
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (!window.confirm("Clear every task from this browser? This cannot be undone.")) return;
              clearAllThreads();
              toast.success("All tasks cleared");
              navigate({ to: "/" });
            }}
          >
            <Trash2 /> Clear all tasks
          </Button>
        </div>
      )}
    </aside>
  );
}
