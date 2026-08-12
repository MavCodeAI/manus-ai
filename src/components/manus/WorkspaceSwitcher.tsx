import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createProject,
  deleteProject,
  renameProject,
  selectProject,
  useActiveProjectId,
  useProjects,
} from "@/lib/workspace";
import { Check, ChevronDown, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const projects = useProjects();
  const activeId = useActiveProjectId();
  const active = projects.find((project) => project.id === activeId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const submit = () => {
    const project = createProject(name, description);
    if (!project) return;
    setName("");
    setDescription("");
    setOpen(false);
    toast.success(`Project “${project.name}” created`);
  };

  return (
    <div className="px-3">
      <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-background/40 px-2.5 py-2">
        <FolderKanban className="size-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Project</p>
          <select
            aria-label="Select project"
            value={activeId ?? ""}
            onChange={(event) => selectProject(event.target.value || null)}
            className="mt-0.5 w-full truncate bg-transparent text-sm font-medium outline-none"
          >
            <option value="">Personal workspace</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-2 flex items-center gap-1">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 flex-1 justify-start gap-1.5 px-2 text-xs text-muted-foreground">
              <Plus className="size-3.5" /> New project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a project</DialogTitle>
              <DialogDescription>Keep instructions, tasks, sources, and outputs together.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input autoFocus value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="Project name" onKeyDown={(event) => event.key === "Enter" && submit()} />
              <Input value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder="Optional description" />
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!name.trim()}>Create project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {active && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Rename project"
              aria-label="Rename project"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => { setEditingId(active.id); setEditingName(active.name); }}
            ><Pencil className="size-3.5" /></button>
            <button
              type="button"
              title="Delete project"
              aria-label="Delete project"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
              onClick={() => { if (window.confirm(`Delete project “${active.name}”?`)) { deleteProject(active.id); toast.success("Project deleted"); } }}
            ><Trash2 className="size-3.5" /></button>
          </div>
        )}
      </div>

      {editingId && (
        <div className="mt-2 flex items-center gap-1">
          <Input autoFocus value={editingName} onChange={(event) => setEditingName(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { renameProject(editingId, editingName); setEditingId(null); } if (event.key === "Escape") setEditingId(null); }} className="h-8 text-xs" />
          <button type="button" title="Save project name" aria-label="Save project name" className="rounded-md p-1.5 text-accent hover:bg-secondary" onClick={() => { renameProject(editingId, editingName); setEditingId(null); }}><Check className="size-3.5" /></button>
        </div>
      )}
    </div>
  );
}
