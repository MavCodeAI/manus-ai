import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import type { ToolUIPart } from "ai";
import { resolveApproval, recordApproval } from "@/lib/approvals";
import { BadgeCheck, BookOpen, CheckCircle2, Circle, Download, ExternalLink, FileText, ListChecks, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

type PlanOutput = { title: string; steps: string[] };
type SearchOutput = { query: string; results: { title: string; url: string; snippet: string }[] };
type PageOutput = { url: string; title: string; text: string; links: { label: string; url: string }[] };
type ApprovalOutput = { id: string; action: string; reason: string; status: "pending" | "approved" | "denied" };
type CitationOutput = { claim: string; url: string; title: string; confidence: number; excerpt: string };
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

export function ApprovalCard({ part, onDecision }: { part: ToolUIPart; onDecision?: (status: "approved" | "denied", approval: ApprovalOutput) => void }) {
  const output = part.output as ApprovalOutput | undefined;
  const input = part.input as Partial<ApprovalOutput> | undefined;
  const approval = output ?? { id: input?.id ?? `approval-${Date.now()}`, action: input?.action ?? "Sensitive action", reason: input?.reason ?? "User confirmation is required.", status: "pending" as const };
  useEffect(() => { recordApproval(approval); }, [approval.id, approval.action, approval.reason]);
  const pending = approval.status === "pending";
  return (
    <div role="alert" className="surface-panel my-3 border-accent/40 bg-accent/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Approval required</p>
          <p className="mt-1 text-sm">{approval.action}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{approval.reason}</p>
          {pending ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { resolveApproval(approval.id, "approved"); onDecision?.("approved", approval); }}>Allow once</Button>
              <Button size="sm" variant="outline" onClick={() => { resolveApproval(approval.id, "denied"); onDecision?.("denied", approval); }}>Deny</Button>
            </div>
          ) : <p className="mt-3 text-xs font-medium text-muted-foreground">Decision: {approval.status}</p>}
        </div>
      </div>
    </div>
  );
}

export function CitationCard({ part }: { part: ToolUIPart }) {
  const output = part.output as CitationOutput | undefined;
  if (!output) return <Tool defaultOpen={false} className="my-3"><ToolHeader type="tool-verify_citation" state={part.state} /><ToolContent><ToolInput input={part.input} /></ToolContent></Tool>;
  const percent = Math.round(output.confidence * 100);
  return <div className="surface-panel my-3 border-emerald-500/30 bg-emerald-500/5 p-3"><div className="flex items-start gap-2"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /><div className="min-w-0"><p className="text-xs font-medium">Citation check · {percent}% match</p><p className="mt-1 text-sm">{output.claim}</p><a href={output.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-accent hover:underline">{output.title || output.url}</a><p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{output.excerpt}</p></div></div></div>;
}

export function PageCard({ part }: { part: ToolUIPart }) {
  const output = part.output as PageOutput | undefined;
  const input = part.input as { url?: string } | undefined;
  return (
    <Tool defaultOpen={false} className="my-3">
      <ToolHeader type={part.type} state={part.state} title={`Opened page — ${output?.title ?? input?.url ?? ""}`} />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput
          errorText={part.errorText}
          output={output ? (
            <div className="space-y-3">
              <a href={output.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent underline underline-offset-2">
                <ExternalLink className="size-3" /> Open source page
              </a>
              <p className="max-h-48 overflow-auto text-xs leading-5 text-muted-foreground">{output.text}</p>
              {output.links.length > 0 && (
                <div className="space-y-1 border-t border-border pt-2">
                  <p className="flex items-center gap-1 text-xs font-medium"><BookOpen className="size-3" /> Related links</p>
                  {output.links.slice(0, 5).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-muted-foreground hover:text-foreground">{link.label}</a>)}
                </div>
              )}
            </div>
          ) : undefined}
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
        <Button variant="ghost" size="icon-sm" title={`Download ${output.filename}`} aria-label={`Download ${output.filename}`} className="ml-auto" onClick={download}>
          <Download />
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto bg-secondary/50 p-4 font-mono text-xs leading-relaxed">
        <code>{output.content}</code>
      </pre>
    </div>
  );
}