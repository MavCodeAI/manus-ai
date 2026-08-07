import { AppShell } from "@/components/manus/AppShell";
import { ChatView } from "@/components/manus/ChatView";
import { newThreadId } from "@/lib/threads";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manus — the autonomous AI agent that finishes the work" },
      {
        name: "description",
        content:
          "Give Manus a task: it plans the steps, searches the live web, and delivers finished files back to you.",
      },
      { property: "og:title", content: "Manus — autonomous AI agent" },
      {
        property: "og:description",
        content: "Plans tasks, searches the web, and hands back finished files.",
      },
    ],
  }),
  component: NewTaskPage,
});

function NewTaskPage() {
  const [threadId] = useState(() => newThreadId());

  return (
    <AppShell>
      <ChatView threadId={threadId} initialMessages={[]} />
    </AppShell>
  );
}
