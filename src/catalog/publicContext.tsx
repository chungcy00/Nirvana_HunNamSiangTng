import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import type { PrototypeProduct } from "../prototype/model";
import { useLocation } from "react-router-dom";
import {
  loadPublicProducts,
  publicConfig,
  type PublicConfig,
} from "./publicRepository";
export type PublicCatalogState = {
  products: readonly PrototypeProduct[];
  status: "loading" | "ready" | "error";
  retry: () => void;
  config?: PublicConfig;
};
export const PublicCatalogContext = createContext<PublicCatalogState>({
  products: [],
  status: "loading",
  retry: () => {},
});
export const usePublicCatalog = () => useContext(PublicCatalogContext);
export function PublicCatalogProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<Omit<PublicCatalogState, "retry">>({
    products: [],
    status: "loading",
  });
  useEffect(() => {
    const abort = new AbortController();
    setState({ products: [], status: "loading" });
    let config: PublicConfig;
    try {
      config = publicConfig(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        import.meta.env.DEV,
      );
    } catch {
      setState({ products: [], status: "error" });
      return;
    }
    const timeout = setTimeout(() => abort.abort(), 20000);
    loadPublicProducts(config, abort.signal)
      .then((products) => {
        if (!abort.signal.aborted)
          setState({ products, status: "ready", config });
      })
      .catch(() => {
        if (!cancelled) setState({ products: [], status: "error", config });
      })
      .finally(() => clearTimeout(timeout));
    let cancelled = false;
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      abort.abort();
    };
  }, [version, pathname]);
  useEffect(() => {
    const reload = () => setVersion((v) => v + 1);
    const visible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", reload);
    window.addEventListener("pageshow", reload);
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 60000);
    return () => {
      window.removeEventListener("focus", reload);
      window.removeEventListener("pageshow", reload);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(interval);
    };
  }, []);
  return (
    <PublicCatalogContext.Provider
      value={{ ...state, retry: () => setVersion((v) => v + 1) }}
    >
      {children}
    </PublicCatalogContext.Provider>
  );
}
export function PublicCatalogNotice() {
  const { status, retry } = usePublicCatalog();
  if (status === "ready") return null;
  const failed = status === "error";
  return (
    <div className="fgp-empty fgp-load-notice" role={failed ? "alert" : "status"} aria-busy={!failed}>
      {failed ? <RotateCcw size={28} strokeWidth={1.5} aria-hidden="true"/> : <LoaderCircle className="fgp-load-spinner" size={28} strokeWidth={1.5} aria-hidden="true"/>}
      <h3>{failed ? "产品资料暂时无法载入" : "正在载入产品资料…"}</h3>
      <p>{failed ? "请检查网络连接，再点击“重新载入”。" : "请稍候，资料载入后会显示在这里。"}</p>
      {failed && <button type="button" className="fgp-primary" onClick={retry}>
        <RotateCcw size={16} aria-hidden="true"/>重新载入
      </button>}
    </div>
  );
}
