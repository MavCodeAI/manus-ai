import { Button } from "@/components/ui/button";
import { deleteWorkspaceFile, useWorkspaceFiles } from "@/lib/files";
import { useActiveProjectId } from "@/lib/workspace";
import { Download, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

function downloadFile(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function WorkspaceFiles() {
  const projectId = useActiveProjectId();
  const files = useWorkspaceFiles(projectId);

  if (files.length === 0) {
    return (
      <div className="mx-3 mt-3 rounded-lg border border-dashed border-sidebar-border px-3 py-3 text-xs leading-5 text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground"><FileText className="size-3.5 text-accent" /> Files</div>
        <p className="mt-1">Attach a PDF or image to add extracted text here.</p>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-background/30 p-2">
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Files · {files.length}</span>
      </div>
      <div className="mt-1 space-y-1">
        {files.slice(0, 6).map((file) => (
          <div key={file.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-secondary">
            <FileText className="size-3.5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate text-xs" title={file.filename}>{file.filename}</span>
            <Button variant="ghost" size="icon-sm" title={`Download ${file.filename}`} aria-label={`Download ${file.filename}`} className="size-6 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100" onClick={() => downloadFile(file.filename, file.content)}><Download className="size-3" /></Button>
            <Button variant="ghost" size="icon-sm" title={`Delete ${file.filename}`} aria-label={`Delete ${file.filename}`} className="size-6 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 hover:text-destructive" onClick={() => { if (window.confirm(`Delete ${file.filename}?`)) { deleteWorkspaceFile(file.id); toast.success("File deleted"); } }}><Trash2 className="size-3" /></Button>
          </div>
        ))}
      </div>
      {files.length > 6 && <p className="px-1 pt-1 text-[10px] text-muted-foreground">Showing the latest 6 files.</p>}
    </div>
  );
}
