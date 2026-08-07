import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import {
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Loader2,
  PanelRightClose,
  Search,
} from "lucide-react";

export type DerivedTask = {
  id: string;
  title: string;
  steps: string[];
  status: "planning" | "running" | "done";
  progress: number;
  files: { filename: string; content: string; bytes: number }[];
  searches: string[];
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
  onClose,
}: {
  tasks: DerivedTask[];
  onClose?: (() => void) | undefined;
}) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-sm font-medium">Tasks in this thread</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
        {onClose && (
          <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onClose}>
            <PanelRightClose />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {tasks.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">
            No tasks yet. Give Manus something to do and its plan, progress and outputs show up
            here.
          </p>
        )}

        {tasks.map((task) => (
          <div key={task.id} className="surface-panel p-3">
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

            {task.files.length > 0 && (
              <div className="mt-3 space-y-1">
                {task.files.map((file, index) => (
                  <button
                    key={`${file.filename}-${index}`}
                    onClick={() => downloadFile(file.filename, file.content)}
                    className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs hover:bg-secondary"
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
