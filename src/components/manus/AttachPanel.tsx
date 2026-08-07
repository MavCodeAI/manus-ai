import { Button } from "@/components/ui/button";
import { Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export type Attachment = { filename: string; text: string };

export function AttachPanel({
  attachments,
  onChange,
}: {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const extracted: Attachment[] = [];
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read file"));
          reader.readAsDataURL(file);
        });
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, mime: file.type, dataUrl }),
        });
        const json = (await res.json()) as { text?: string; error?: string };
        if (!res.ok || !json.text) throw new Error(json.error ?? "Extraction failed");
        extracted.push({ filename: file.name, text: json.text });
      } catch (error) {
        toast.error(`${file.name}: ${(error as Error).message}`);
      }
    }
    setBusy(false);
    if (extracted.length > 0) {
      onChange([...attachments, ...extracted]);
      toast.success(`Text extracted from ${extracted.length} file(s)`);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />

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
                aria-label={`Remove ${attachment.filename}`}
                onClick={() => onChange(attachments.filter((_, i) => i !== index))}
                className="text-muted-foreground hover:text-destructive"
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
    </div>
  );
}
