import { newThreadId } from "@/lib/threads";
import { createFileRoute, redirect } from "@tanstack/react-router";

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
  beforeLoad: () => {
    throw redirect({ to: "/$threadId", params: { threadId: newThreadId() }, replace: true });
  },
  component: () => null,
});
