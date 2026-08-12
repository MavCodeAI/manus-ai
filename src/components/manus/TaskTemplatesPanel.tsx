import { Button } from "@/components/ui/button";
import { ClipboardList, Copy } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = [
  ["Research report", "Research this topic using primary sources, verify the claims, cite every important fact, and deliver a Markdown report."],
  ["Website audit", "Audit this website for UI/UX, accessibility, SEO, performance, and conversion issues. Prioritize fixes and provide an implementation plan."],
  ["GitHub coding task", "Inspect the connected repository, understand the relevant code, implement the requested change, run tests, and prepare a reviewable patch."],
  ["Weekly briefing", "Prepare a concise weekly briefing from the latest relevant sources, highlight changes, risks, and recommended next actions."],
] as const;

export function TaskTemplatesPanel() {
  const copy = async (prompt: string) => { await navigator.clipboard?.writeText(prompt); toast.success("Template copied to clipboard"); };
  return (
    <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-background/30 p-2">
      <div className="flex items-center gap-2 px-1 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"><ClipboardList className="size-3" /> Templates</div>
      <div className="mt-1 space-y-1">{TEMPLATES.map(([name, prompt]) => <Button key={name} variant="ghost" className="h-7 w-full justify-between px-2 text-xs" title={prompt} onClick={() => copy(prompt)}><span className="truncate">{name}</span><Copy className="size-3 shrink-0 text-muted-foreground" /></Button>)}</div>
    </div>
  );
}
