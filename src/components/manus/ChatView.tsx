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
import { FileCard, PlanCard, SearchCard } from "@/components/manus/ToolParts";
import manusMark from "@/assets/manus-mark.png";
import { createThread, saveMessages, useThread } from "@/lib/threads";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thread = useThread(threadId);

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => toast.error(error.message || "Manus could not finish that task"),
  });

  useEffect(() => {
    if (messages.length > 0) saveMessages(threadId, messages);
  }, [messages, threadId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    createThread(threadId, trimmed.slice(0, 60));
    setInput("");
    void sendMessage({ text: trimmed });
  };

  return (
    <div className="flex h-full flex-col">
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
                    if (part.type === "tool-web_search") {
                      return <SearchCard key={index} part={part as ToolUIPart} />;
                    }
                    if (part.type === "tool-deliver_file") {
                      return <FileCard key={index} part={part as ToolUIPart} />;
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}

          {status === "submitted" && (
            <Shimmer className="px-1 text-sm">Manus is thinking…</Shimmer>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
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
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!input.trim() && !busy} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tasks are saved in this browser only.
        </p>
      </div>
    </div>
  );
}