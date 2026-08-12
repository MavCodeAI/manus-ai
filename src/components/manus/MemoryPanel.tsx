import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemory, deleteMemory, useMemory } from "@/lib/memory";
import { useActiveProjectId } from "@/lib/workspace";
import { Brain, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function MemoryPanel() {
  const projectId = useActiveProjectId();
  const memories = useMemory(projectId);
  const [value, setValue] = useState("");
  const save = () => { if (!value.trim()) return; addMemory(value, projectId); setValue(""); toast.success("Memory saved"); };
  return (
    <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-background/30 p-2">
      <div className="flex items-center gap-2 px-1 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Brain className="size-3" /> Memory</div>
      <div className="mt-1 flex gap-1"><Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); }} placeholder="Remember this..." className="h-7 text-xs" aria-label="Add memory" /><Button size="icon-sm" className="size-7 shrink-0" title="Save memory" aria-label="Save memory" onClick={save}><Plus className="size-3" /></Button></div>
      {memories.length > 0 && <div className="mt-2 space-y-1">{memories.slice(0, 4).map((memory) => <div key={memory.id} className="group flex gap-1 rounded px-1 py-1 text-xs hover:bg-secondary"><span className="min-w-0 flex-1 truncate" title={memory.text}>{memory.text}</span><Button variant="ghost" size="icon-sm" className="size-5 opacity-0 group-hover:opacity-100" title="Delete memory" aria-label="Delete memory" onClick={() => deleteMemory(memory.id)}><Trash2 className="size-3" /></Button></div>)}</div>}
    </div>
  );
}
