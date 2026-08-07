import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import type { ToolUIPart } from "ai";
import { CheckCircle2, Circle, Download, FileText, ListChecks } from "lucide-react";

type PlanOutput = { title: string; steps: string[] };
type SearchOutput = { query: string; results: { title: string; url: string; snippet: string }[] };
type FileOutput = { filename: string; language: string; content: string; bytes: number };

export function PlanCard({ part }: { part: ToolUIPart }) {
  const output = part.output as PlanOutput | undefined;
  const running = part.state !== "output-available";

  return (
    <div className="surface-panel my-3 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ListChecks className="size-4 text-accent" />
        {output?.title ?? "Planning the task"}
      </div>
      <ol className="mt-3 space-y-2">
        {(output?.steps ?? []).map((step, index) => (
          <li key={index} className="flex gap-2 text-sm text-muted-foreground">
            {running ? (
              <Circle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
            )}
            <span>{step}</span>
          </li>
        ))}
        {!output && <li className="text-sm text-muted-foreground">Working out the steps…</li>}
      </ol>
    </div>
  );
}

export function SearchCard({ part }: { part: ToolUIPart }) {
  const output = part.output as SearchOutput | undefined;
  const input = part.input as { query?: string } | undefined;

  return (
    <Tool defaultOpen={false} className="my-3">
      <ToolHeader
        type={part.type}
        state={part.state}
        title={`Web search — ${output?.query ?? input?.query ?? ""}`}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput
          errorText={part.errorText}
          output={
            output ? (
              <ul className="space-y-3">
                {output.results.map((result) => (
                  <li key={result.url}>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium underline decoration-accent/50 underline-offset-2"
                    >
                      {result.title}
                    </a>
                    <p className="text-xs text-muted-foreground">{result.snippet}</p>
                  </li>
                ))}
                {output.results.length === 0 && (
                  <li className="text-sm text-muted-foreground">No results.</li>
                )}
              </ul>
            ) : undefined
          }
        />
      </ToolContent>
    </Tool>
  );
}

export function FileCard({ part }: { part: ToolUIPart }) {
  const output = part.output as FileOutput | undefined;
  if (!output) {
    return (
      <div className="surface-panel my-3 flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <FileText className="size-4 text-accent" /> Writing file…
      </div>
    );
  }

  const download = () => {
    const blob = new Blob([output.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = output.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="surface-panel my-3 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <FileText className="size-4 text-accent" />
        <span className="font-mono text-xs">{output.filename}</span>
        <span className="text-xs text-muted-foreground">{output.bytes} B</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={download}>
          <Download />
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto bg-secondary/50 p-4 font-mono text-xs leading-relaxed">
        <code>{output.content}</code>
      </pre>
    </div>
  );
}