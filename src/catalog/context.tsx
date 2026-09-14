import { createContext, useContext, useMemo, type ReactNode } from "react";
import { catalogData } from "../data/catalog";
import type { CatalogSnapshot } from "../types";
import { createCatalog } from "./repository";

const CatalogContext = createContext(createCatalog(catalogData));
export function CatalogProvider({
  children,
  data = catalogData,
}: {
  children: ReactNode;
  data?: CatalogSnapshot;
}) {
  const repository = useMemo(() => createCatalog(data), [data]);
  return (
    <CatalogContext.Provider value={repository}>
      {children}
    </CatalogContext.Provider>
  );
}
export function useCatalog() {
  return useContext(CatalogContext);
}
