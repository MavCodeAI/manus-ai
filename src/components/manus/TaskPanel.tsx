import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRunEvents } from "@/lib/run-events";
import type { UIMessage } from "ai";
import {
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Loader2,
  PanelRightClose,
  Search,
  ExternalLink,
  Activity,
} from "lucide-react";

export type DerivedTask = {
  id: string;
  title: string;
  steps: string[];
  status: "planning" | "running" | "done";
  progress: number;
  files: { filename: string; content: string; bytes: number }[];
  searches: string[];
  pages: { title: string; url: string }[];
};

type AnyPart = UIMessage["parts"][number] & {
  type: string;
  state?: string;
  output?: unknown;
  input?: unknown;
};

export function deriveTasks(messages: UIMessage[], busy: boolean): DerivedTask[] {
  const tasks: DerivedTask[] = [];
  let current: DerivedTask | null = null;

  messages.forEach((message, messageIndex) => {
    (message.parts as AnyPart[]).forEach((part, partIndex) => {
      const id = `${message.id ?? messageIndex}-${partIndex}`;
      if (part.type === "tool-plan_task") {
        const output = part.output as { title?: string; steps?: string[] } | undefined;
        const input = part.input as { title?: string; steps?: string[] } | undefined;
        current = {
          id,
          title: output?.title ?? input?.title ?? "Task",
          steps: output?.steps ?? input?.steps ?? [],
          status: part.state === "output-available" ? "running" : "planning",
          progress: 0,
          files: [],
          searches: [],
          pages: [],
        };
        tasks.push(current);
        return;
      }
      if (!current) return;
      if (part.type === "tool-web_search") {
        const output = part.output as { query?: string } | undefined;
        const input = part.input as { query?: string } | undefined;
        const query = output?.query ?? input?.query;
        if (query) current.searches.push(query);
      }
      if (part.type === "tool-open_public_page" && part.state === "output-available") {
        const output = part.output as { title?: string; url?: string } | undefined;
        if (output?.url) current.pages.push({ title: output.title ?? output.url, url: output.url });
      }
      if (part.type === "tool-deliver_file" && part.state === "output-available") {
        const output = part.output as
          | { filename: string; content: string; bytes: number }
          | undefined;
        if (output) current.files.push(output);
      }
      if (part.type === "text" && message.role === "assistant" && part.state !== "streaming") {
        current.status = "done";
      }
    });
  });

  return tasks.map((task, index) => {
    const isLast = index === tasks.length - 1;
    const activity = task.searches.length + task.files.length;
    const done = task.status === "done" && !(isLast && busy);
    const total = Math.max(task.steps.length, 1);
    const progress = done ? 100 : Math.min(90, Math.round((activity / total) * 100) + 10);
    return { ...task, status: done ? "done" : isLast && busy ? "running" : task.status, progress };
  });
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TaskPanel({
  tasks,
  runId,
  onClose,
}: {
  tasks: DerivedTask[];
  runId?: string;
  onClose?: (() => void) | undefined;
}) {
  const events = useRunEvents(runId).slice(-8).reverse();
  return (
    <aside aria-label="Run inspector" className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3" aria-live="polite">
        <span className="text-sm font-medium">Run inspector</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
        {onClose && (
            <Button variant="ghost" size="icon-sm" className="ml-auto" title="Close run inspector" onClick={onClose}>
            <PanelRightClose />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {events.length > 0 && (
          <div className="surface-panel p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Activity className="size-3" /> Live event trail</div>
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="flex gap-2 text-xs">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0"><p className="text-foreground/80">{event.label}</p>{event.detail && <p className="truncate text-muted-foreground">{event.detail}</p>}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
            <div className="surface-panel p-4">
              <p className="text-sm font-medium">Your run will appear here</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Plans, live progress, sources, approvals, and downloadable files will stay visible
                while Manus works.
              </p>
            </div>
        )}

        {tasks.map((task) => (
            <div key={task.id} className="surface-panel p-3" aria-label={`${task.title} ${task.status}`}>
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Execution</span>
                <span className={cn(
                  "rounded-full px-2 py-0.5",
                  task.status === "done" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-accent/10 text-accent"
                )}>{task.status}</span>
              </div>
            <div className="flex items-start gap-2">
              {task.status === "done" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
              ) : (
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-accent" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs capitalize text-muted-foreground">{task.status}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{task.progress}%</span>
            </div>

            <Progress value={task.progress} className="mt-3 h-1.5" />

            {task.steps.length > 0 && (
              <ol className="mt-3 space-y-1.5">
                {task.steps.map((step, index) => {
                  const reached = task.status === "done" || task.progress >= ((index + 1) / task.steps.length) * 100;
                  return (
                    <li key={index} className="flex gap-2 text-xs text-muted-foreground">
                      {reached ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                      ) : (
                        <Circle className="mt-0.5 size-3.5 shrink-0" />
                      )}
                      <span className={cn(reached && "text-foreground/80")}>{step}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {task.searches.length > 0 && (
              <div className="mt-3 space-y-1">
                {task.searches.map((query, index) => (
                  <p
                    key={`${query}-${index}`}
                    className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"
                  >
                    <Search className="size-3 shrink-0" /> {query}
                  </p>
                ))}
              </div>
            )}

            {task.pages.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-border pt-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Opened sources</p>
                {task.pages.map((page, index) => (
                  <a key={`${page.url}-${index}`} href={page.url} target="_blank" rel="noreferrer" title={page.url} className="flex items-center gap-1.5 truncate rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ExternalLink className="size-3 shrink-0 text-accent" />
                    <span className="truncate">{page.title}</span>
                  </a>
                ))}
              </div>
            )}

            {task.files.length > 0 && (
              <div className="mt-3 space-y-1">
                {task.files.map((file, index) => (
                  <button
                    key={`${file.filename}-${index}`}
                    onClick={() => downloadFile(file.filename, file.content)}
                    title={`Download ${file.filename}`}
                    className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileText className="size-3 shrink-0 text-accent" />
                    <span className="truncate font-mono">{file.filename}</span>
                    <Download className="ml-auto size-3 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
