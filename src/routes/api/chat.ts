import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

const SYSTEM_PROMPT = `You are Manus, an autonomous general AI agent.

Working style:
1. For any non-trivial request, FIRST call the "plan_task" tool with a short list of 2-6 concrete steps.
2. Use "web_search" whenever the answer depends on current facts, news, prices, docs or anything you are unsure about. Cite sources as markdown links.
3. Use "deliver_file" to produce any concrete artifact the user can keep: code, scripts, markdown reports, CSV data, configs. Put the full content in the tool call, then summarise it briefly in the chat instead of repeating the whole file.
4. After your steps, give a tight, well-structured markdown answer. No filler, no restating the question.

Be direct and practical. Reply in the user's language.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
          stopWhen: stepCountIs(50),
          tools: {
            plan_task: tool({
              description:
                "Publish the step-by-step plan for the user's task before doing the work.",
              inputSchema: z.object({
                title: z.string().describe("Short task title"),
                steps: z.array(z.string()).describe("Ordered, concrete steps"),
              }),
              execute: async ({ title, steps }) => ({ title, steps }),
            }),
            web_search: tool({
              description:
                "Search the live web and get titles, URLs and snippets for a query.",
              inputSchema: z.object({ query: z.string() }),
              execute: async ({ query }) => {
                const { searchWeb } = await import("@/lib/web-search.server");
                const results = await searchWeb(query);
                return { query, results };
              },
            }),
            deliver_file: tool({
              description:
                "Deliver a file artifact (code, markdown report, csv, config) to the user's workspace panel.",
              inputSchema: z.object({
                filename: z.string(),
                language: z.string().describe("Syntax language, e.g. ts, python, markdown, csv"),
                content: z.string(),
              }),
              execute: async ({ filename, language, content }) => ({
                filename,
                language,
                content,
                bytes: content.length,
              }),
            }),
          },
          onError: ({ error }) => {
            console.error("chat stream error", error);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});