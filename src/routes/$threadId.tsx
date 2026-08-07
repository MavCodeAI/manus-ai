import { AppShell } from "@/components/manus/AppShell";
import { ChatView } from "@/components/manus/ChatView";
import { useThread } from "@/lib/threads";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/$threadId")({
  head: () => ({
    meta: [
      { title: "Task — Manus AI agent" },
      {
        name: "description",
        content:
          "Follow a Manus task live: the plan, its web research, and the files it delivers.",
      },
      { property: "og:title", content: "Manus task workspace" },
      {
        property: "og:description",
        content: "Watch Manus plan, research and deliver a task end to end.",
      },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const thread = useThread(threadId);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <AppShell activeId={threadId}>
        <div className="h-full" />
      </AppShell>
    );
  }

  return (
    <AppShell activeId={threadId}>
      <ChatView key={threadId} threadId={threadId} initialMessages={thread?.messages ?? []} />
    </AppShell>
  );
}