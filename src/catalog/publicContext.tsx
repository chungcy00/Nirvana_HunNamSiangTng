import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { createPublicRefresh, type PublicSnapshot } from "./publicRefresh";
import { useLocation } from "react-router-dom";
import {
  loadPublicProducts,
  publicConfig,
  type PublicConfig,
} from "./publicRepository";
export type PublicCatalogState = PublicSnapshot & {
  retry: () => void;
};
export const PublicCatalogContext = createContext<PublicCatalogState>({
  products: [],
  status: "loading",
  retry: () => {},
});
export const usePublicCatalog = () => useContext(PublicCatalogContext);
export function PublicCatalogProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const refreshRef = useRef<ReturnType<typeof createPublicRefresh> | null>(null);
  const [state, setState] = useState<PublicSnapshot>({ products: [], status: "loading" });
  useEffect(() => {
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
    const refresh = createPublicRefresh({
      config,
      load: signal => loadPublicProducts(config, signal),
      publish: setState,
    });
    refreshRef.current = refresh;
    void refresh.refresh();
    const reload = () => { void refresh.refresh(); };
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
      refreshRef.current = null;
      refresh.dispose();
      window.removeEventListener("focus", reload);
      window.removeEventListener("pageshow", reload);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(interval);
    };
  }, []);
  useEffect(() => { void refreshRef.current?.refresh({ force: true, foreground: true }); }, [pathname]);
  return (
    <PublicCatalogContext.Provider
      value={{ ...state, retry: () => { void refreshRef.current?.refresh({ force: true }); } }}
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
