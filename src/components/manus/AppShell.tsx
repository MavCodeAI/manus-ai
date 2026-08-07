import { ThreadSidebar } from "@/components/manus/ThreadSidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useState, type ReactNode } from "react";

export function AppShell({
  activeId,
  children,
}: {
  activeId?: string | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="hidden lg:block">
        <ThreadSidebar activeId={activeId} />
      </div>

      {open && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <ThreadSidebar activeId={activeId} onClose={() => setOpen(false)} />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b border-border px-3 lg:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
            <PanelLeft />
          </Button>
          <span className="text-display text-lg">Manus</span>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}