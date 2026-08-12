import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { saveWorkspaceFile } from "@/lib/files";
import { CheckCircle2, FileText, ImageIcon, Loader2, Paperclip, X, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export type Attachment = { filename: string; text: string };

type UploadJob = {
  id: string;
  filename: string;
  kind: "pdf" | "image";
  size: number;
  progress: number;
  state: "reading" | "extracting" | "done" | "error";
  error?: string;
};

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];

function validate(file: File): { ok: true; kind: "pdf" | "image" } | { ok: false; reason: string } {
  if (!ACCEPTED.includes(file.type)) {
    return { ok: false, reason: "Only PDF, PNG, JPEG, WebP or GIF files are allowed" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: `Too large (${(file.size / 1048576).toFixed(1)} MB, max 20 MB)` };
  }
  if (file.size === 0) return { ok: false, reason: "File is empty" };
  return { ok: true, kind: file.type === "application/pdf" ? "pdf" : "image" };
}

export function AttachPanel({
  attachments,
  onChange,
  projectId,
}: {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  projectId?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const busy = jobs.some((job) => job.state === "reading" || job.state === "extracting");

  const patch = (id: string, next: Partial<UploadJob>) =>
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...next } : job)));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const extracted: Attachment[] = [];

    for (const file of Array.from(files)) {
      const check = validate(file);
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (!check.ok) {
        setJobs((current) => [
          ...current,
          {
            id,
            filename: file.name,
            kind: "pdf",
            size: file.size,
            progress: 100,
            state: "error",
            error: check.reason,
          },
        ]);
        toast.error(`${file.name}: ${check.reason}`);
        continue;
      }

      setJobs((current) => [
        ...current,
        { id, filename: file.name, kind: check.kind, size: file.size, progress: 0, state: "reading" },
      ]);

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              patch(id, { progress: Math.round((event.loaded / event.total) * 40) });
            }
          };
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read file"));
          reader.readAsDataURL(file);
        });

        patch(id, { progress: 55, state: "extracting" });
        const ticker = setInterval(() => {
          setJobs((current) =>
            current.map((job) =>
              job.id === id && job.state === "extracting"
                ? { ...job, progress: Math.min(92, job.progress + 4) }
                : job,
            ),
          );
        }, 400);

        try {
          const res = await fetch("/api/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, mime: file.type, dataUrl }),
          });
          const json = (await res.json()) as { text?: string; error?: string };
          if (!res.ok || !json.text) throw new Error(json.error ?? "Extraction failed");
          extracted.push({ filename: file.name, text: json.text });
          saveWorkspaceFile(file.name, json.text, projectId);
          patch(id, { progress: 100, state: "done" });
          setTimeout(() => setJobs((current) => current.filter((job) => job.id !== id)), 1600);
        } finally {
          clearInterval(ticker);
        }
      } catch (error) {
        patch(id, { state: "error", progress: 100, error: (error as Error).message });
        toast.error(`${file.name}: ${(error as Error).message}`);
      }
    }

    if (extracted.length > 0) {
      onChange([...attachments, ...extracted]);
      toast.success(`Text extracted from ${extracted.length} file(s)`);
    }
  };

  return (
    <section aria-label="Attachments" className="min-w-0 flex-1">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        aria-label="Choose PDF or image files"
        onChange={(event) => {
          void handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />

      {jobs.length > 0 && (
        <div className="mb-2 space-y-2" aria-live="polite">
          {jobs.map((job) => (
            <div key={job.id} className="surface-panel px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                {job.kind === "pdf" ? (
                  <FileText className="size-3.5 shrink-0 text-accent" />
                ) : (
                  <ImageIcon className="size-3.5 shrink-0 text-accent" />
                )}
                <span className="max-w-40 truncate font-mono">{job.filename}</span>
                <span className="text-muted-foreground">
                  {(job.size / 1024).toFixed(0)} KB
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                  {job.state === "done" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                  {job.state === "error" && <XCircle className="size-3.5 text-destructive" />}
                  {(job.state === "reading" || job.state === "extracting") && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  {job.state === "error"
                    ? job.error
                    : job.state === "done"
                      ? "Ready"
                      : job.state === "reading"
                        ? `Uploading ${job.progress}%`
                        : `Extracting ${job.progress}%`}
                </span>
              </div>
              <Progress
                value={job.progress}
                className={job.state === "error" ? "mt-2 h-1 opacity-50" : "mt-2 h-1"}
              />
            </div>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <span
              key={`${attachment.filename}-${index}`}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs"
            >
              <span className="max-w-40 truncate font-mono">{attachment.filename}</span>
              <span className="text-muted-foreground">{attachment.text.length} chars</span>
              <button
                type="button"
                aria-label={`Remove ${attachment.filename}`}
                title={`Remove ${attachment.filename}`}
                onClick={() => onChange(attachments.filter((_, i) => i !== index))}
                className="rounded-full text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5 text-muted-foreground"
      >
        {busy ? <Loader2 className="animate-spin" /> : <Paperclip />}
        {busy ? "Reading files…" : "Attach PDF / image"}
      </Button>
    </section>
  );
}
