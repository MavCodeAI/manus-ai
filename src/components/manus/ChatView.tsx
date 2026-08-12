import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AttachPanel, type Attachment } from "@/components/manus/AttachPanel";
import { TaskPanel, deriveTasks } from "@/components/manus/TaskPanel";
import { ApprovalCard, CitationCard, FileCard, PageCard, PlanCard, SearchCard } from "@/components/manus/ToolParts";
import manusMark from "@/assets/manus-mark.png";
import { Button } from "@/components/ui/button";
import { createThread, saveMessages, useThread } from "@/lib/threads";
import { recordRunEvent } from "@/lib/run-events";
import { useActiveProjectId, useProjects } from "@/lib/workspace";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart, type UIMessage } from "ai";
import { Copy, ListChecks, Moon, RefreshCw, Square, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Research the 3 fastest-growing AI startups this year and summarise them",
  "Write a Python script that dedupes a CSV by email column",
  "Plan a 5-day Tokyo trip in October on a $1,500 budget",
  "Compare Postgres vs SQLite for a small SaaS and give a recommendation",
];

export function ChatView({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thread = useThread(threadId);
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const activeProject = projects.find((project) => project.id === (thread?.projectId ?? activeProjectId));

  const [dark, setDark] = useState(false);

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => {
      recordRunEvent({ runId: threadId, kind: "run.failed", label: "Run failed", detail: error.message });
      toast.error(error.message || "Manus could not finish that task");
    },
  });

  useEffect(() => {
    if (messages.length > 0) saveMessages(threadId, messages);
  }, [messages, threadId]);

  useEffect(() => {
    if (status === "submitted") recordRunEvent({ runId: threadId, kind: "run.started", label: "Manus started working" });
    if (status === "ready" && messages.length > 0) recordRunEvent({ runId: threadId, kind: "run.completed", label: "Run completed" });
  }, [messages.length, status, threadId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  useEffect(() => {
    const stored = window.localStorage.getItem("manus.theme") === "dark";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("manus.theme", next ? "dark" : "light");
  };

  const busy = status === "submitted" || status === "streaming";
  const tasks = useMemo(() => deriveTasks(messages, busy), [messages, busy]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    createThread(threadId, trimmed.slice(0, 60), activeProjectId ?? undefined);
    setInput("");
    const context = attachments
      .map((a) => `\n\n--- Attached file: ${a.filename} ---\n${a.text}`)
      .join("");
    setAttachments([]);
    void sendMessage({ text: trimmed + context });
  };

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{thread?.title ?? "New task"}</p>
          <p className="text-xs text-muted-foreground">
            {activeProject ? `${activeProject.name} · ` : "Personal workspace · "}
            {busy ? "Manus is working on this task…" : messages.length > 0 ? "Task ready for follow-up" : "Describe the outcome you want"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span className={busy ? "size-2 animate-pulse rounded-full bg-accent" : "size-2 rounded-full bg-emerald-500"} />
          <span>{busy ? "Running" : "Ready"}</span>
        </div>
      </header>
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <img src={manusMark} alt="" width={64} height={64} className="size-16" />
              <h1 className="text-display mt-5 text-4xl">What should I get done?</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Manus plans the task, searches the web, and hands back finished files.
              </p>
              <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => submit(suggestion)}
                    className="surface-panel px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent
                  className={
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent p-0"
                  }
                >
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return <MessageResponse key={index}>{part.text}</MessageResponse>;
                    }
                    if (part.type === "tool-plan_task") {
                      return <PlanCard key={index} part={part as ToolUIPart} />;
                    }
                    if (part.type === "tool-request_approval") {
                      return <ApprovalCard key={index} part={part as ToolUIPart} onDecision={(decision, approval) => void sendMessage({ text: `${decision === "approved" ? "Approved" : "Denied"}: ${approval.action}. ${approval.reason}` })} />;
                    }
                    if (part.type === "tool-web_search") {
                      return <SearchCard key={index} part={part as ToolUIPart} />;
                    }
                    if (part.type === "tool-verify_citation") {
                      return <CitationCard key={index} part={part as ToolUIPart} />;
                    }
                    if (part.type === "tool-open_public_page") {
                      return <PageCard key={index} part={part as ToolUIPart} />;
                    }
                    if (part.type === "tool-deliver_file") {
                      return <FileCard key={index} part={part as ToolUIPart} />;
                    }
                    return null;
                  })}

                  {message.role === "assistant" && !busy && (
                    <div className="mt-1 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Copy answer"
                        onClick={() => {
                          const text = message.parts
                            .map((part) => (part.type === "text" ? part.text : ""))
                            .join("\n")
                            .trim();
                          void navigator.clipboard.writeText(text);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        <Copy />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Regenerate answer"
                        onClick={() => void regenerate({ messageId: message.id })}
                      >
                        <RefreshCw />
                      </Button>
                    </div>
                  )}
                </MessageContent>
              </Message>
            ))
          )}

          {status === "submitted" && (
            <Shimmer className="px-1 text-sm">Manus is thinking…</Shimmer>
          )}
          {error && (
            <div role="alert" className="surface-panel mt-3 border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-destructive">This run could not finish</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {error.message || "Something went wrong while Manus was working. You can retry the last answer."}
                  </p>
                </div>
                {messages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => void regenerate()}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
                <AttachPanel attachments={attachments} onChange={setAttachments} projectId={thread?.projectId ?? activeProjectId} />
          <div className="flex shrink-0 items-center gap-1">
            {busy && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => stop()}
              >
                <Square /> Stop
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle dark mode"
              className="text-muted-foreground"
              onClick={toggleTheme}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground xl:hidden"
              onClick={() => setPanelOpen((value) => !value)}
            >
              <ListChecks /> {tasks.length}
            </Button>
          </div>
        </div>
        <PromptInput
          onSubmit={(_message, event) => {
            event.preventDefault();
            submit(input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder={thread ? "Follow up with Manus…" : "Give Manus a task…"}
          />
          <PromptInputFooter className="justify-between">
            <span className="pl-1 text-xs text-muted-foreground">
              {input.length > 0 ? `${input.length} chars · Enter to send` : "Shift+Enter for a new line"}
            </span>
            <PromptInputSubmit status={status} disabled={!input.trim() && !busy} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tasks are saved in this browser only.
        </p>
      </div>
      </div>

      <div className="hidden xl:block">
          <TaskPanel tasks={tasks} runId={threadId} />
      </div>
      {panelOpen && (
        <div className="fixed inset-y-0 right-0 z-50 shadow-xl xl:hidden">
          <TaskPanel tasks={tasks} runId={threadId} onClose={() => setPanelOpen(false)} />
        </div>
      )}
    </div>
  );
}