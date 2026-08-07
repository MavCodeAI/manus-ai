import manusMark from "@/assets/manus-mark.png";
import { Button } from "@/components/ui/button";
import { createThread, deleteThread, newThreadId, renameThread, useThreads } from "@/lib/threads";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, PanelLeftClose, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function ThreadSidebar({
  activeId,
  onClose,
}: {
  activeId?: string | undefined;
  onClose?: (() => void) | undefined;
}) {
  const threads = useThreads();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commitRename = () => {
    if (editingId && draft.trim()) renameThread(editingId, draft.trim().slice(0, 60));
    setEditingId(null);
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <img src={manusMark} alt="Manus" width={28} height={28} className="size-7" />
        <span className="text-display text-xl">Manus</span>
        {onClose && (
          <Button variant="ghost" size="icon-sm" className="ml-auto lg:hidden" onClick={onClose}>
            <PanelLeftClose />
          </Button>
        )}
      </div>

      <div className="px-3">
        <Button
          className="w-full justify-start gap-2"
          variant="secondary"
          onClick={() => {
            const id = newThreadId();
            createThread(id, "New task");
            onClose?.();
            navigate({ to: "/$threadId", params: { threadId: id } });
          }}
        >
          <Plus /> New task
        </Button>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-6">
        <p className="px-2 py-2 text-xs uppercase tracking-widest text-muted-foreground">Tasks</p>
        {threads.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">No tasks yet.</p>
        )}
        {threads.map((thread) => (
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
                  className="flex-1 truncate px-2 py-2 text-sm text-sidebar-foreground"
                >
                  {thread.title}
                </Link>
                <button
                  aria-label="Rename task"
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  onClick={() => {
                    setEditingId(thread.id);
                    setDraft(thread.title);
                  }}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  aria-label="Delete task"
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => {
                    deleteThread(thread.id);
                    if (thread.id === activeId) navigate({ to: "/" });
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
