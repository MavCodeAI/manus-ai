import { Button } from "@/components/ui/button";
import { setConnectorConnected, useConnectors } from "@/lib/connectors";
import { Check, PlugZap } from "lucide-react";
import { toast } from "sonner";

export function ConnectorsPanel() {
  const connectors = useConnectors();
  return (
    <section aria-label="Connectors" className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-background/30 p-2">
      <div className="flex items-center gap-2 px-1 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"><PlugZap className="size-3" /> Connectors</div>
      <div className="mt-1 space-y-1">
        {connectors.map((connector) => (
          <div key={connector.id} className="rounded-md px-1.5 py-2 hover:bg-secondary">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{connector.name}</span>
              <Button variant={connector.connected ? "secondary" : "ghost"} size="sm" aria-pressed={connector.connected} title={connector.connected ? `Disable ${connector.name}` : `Configure ${connector.name}`} className="h-6 px-2 text-[10px] focus-visible:ring-2" onClick={() => { setConnectorConnected(connector.id, !connector.connected); toast.success(`${connector.name} ${connector.connected ? "disconnected" : "permission profile saved"}`); }}>
                {connector.connected && <Check className="mr-1 size-3" />}{connector.connected ? "Enabled" : "Configure"}
              </Button>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{connector.description}</p>
            <p className="mt-1 truncate text-[10px] text-muted-foreground/70">Scopes: {connector.scopes.join(", ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
