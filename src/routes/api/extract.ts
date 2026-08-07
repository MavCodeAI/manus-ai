import { createFileRoute } from "@tanstack/react-router";

type Body = { filename?: string; mime?: string; dataUrl?: string };

export const Route = createFileRoute("/api/extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { filename, mime, dataUrl } = (await request.json()) as Body;
        if (!dataUrl || !mime || !filename) {
          return new Response(JSON.stringify({ error: "filename, mime and dataUrl are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const isImage = mime.startsWith("image/");
        const isPdf = mime === "application/pdf";
        if (!isImage && !isPdf) {
          return new Response(
            JSON.stringify({ error: "Only PDF and image files can be extracted" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const content = [
          {
            type: "text",
            text: "Extract all readable text from this document verbatim as markdown. Keep tables as markdown tables. No commentary.",
          },
          isImage
            ? { type: "image_url", image_url: { url: dataUrl } }
            : { type: "file", file: { filename, file_data: dataUrl } },
        ];

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            messages: [{ role: "user", content }],
          }),
        });

        if (!res.ok) {
          const detail = await res.text();
          console.error("extract failed", res.status, detail);
          return new Response(
            JSON.stringify({ error: res.status === 429 ? "Rate limited, try again shortly" : "Could not read that file" }),
            { status: res.status, headers: { "Content-Type": "application/json" } },
          );
        }

        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = json.choices?.[0]?.message?.content ?? "";
        return new Response(JSON.stringify({ filename, text }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
