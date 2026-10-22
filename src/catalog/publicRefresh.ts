import type { PrototypeProduct } from "../prototype/model";
import type { PublicConfig } from "./publicRepository";

export type PublicSnapshot = {
  products: readonly PrototypeProduct[];
  status: "loading" | "ready" | "error";
  config?: PublicConfig;
};

/** Coalesce refresh events without persisting or serving failed/stale results. */
export function createPublicRefresh({ load, publish, config, now = Date.now, timeoutMs = 20000 }: {
  load: (signal: AbortSignal) => Promise<readonly PrototypeProduct[]>;
  publish: (snapshot: PublicSnapshot) => void;
  config?: PublicConfig;
  now?: () => number;
  timeoutMs?: number;
}) {
  let snapshot: PublicSnapshot = { products: [], status: "loading", config };
  let pending: Promise<void> | undefined;
  let controller: AbortController | undefined;
  let disposed = false;
  let lastStarted = -Infinity;
  function update(next: PublicSnapshot) {
    if (!disposed) { snapshot = next; publish(next); }
  }
  function refresh({ force = false, foreground = false }: { force?: boolean; foreground?: boolean } = {}): Promise<void> {
    if (disposed) return Promise.resolve();
    // Route changes still require a foreground publication check.
    if (foreground && snapshot.status === "ready") update({ products: [], status: "loading", config });
    if (pending) return pending;
    // Focus, visibility and pageshow often describe the same return to a tab.
    if (!force && now() - lastStarted < 1000) return Promise.resolve();
    lastStarted = now();
    const active = new AbortController();
    controller = active;
    if (snapshot.status !== "ready") update({ products: [], status: "loading", config });
    let rejectAbort: () => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(new Error("Product refresh aborted"));
      active.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    const timeout = setTimeout(() => active.abort(), timeoutMs);
    pending = Promise.race([Promise.resolve().then(() => load(active.signal)), aborted])
      .then(products => { update({ products, status: "ready", config }); })
      .catch(() => { update({ products: [], status: "error", config }); })
      .finally(() => {
        clearTimeout(timeout);
        active.signal.removeEventListener("abort", rejectAbort);
        pending = undefined;
        controller = undefined;
      });
    return pending;
  }
  return {
    refresh,
    dispose() { disposed = true; controller?.abort(); },
  };
}
