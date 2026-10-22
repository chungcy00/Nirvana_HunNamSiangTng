import { Outlet } from "react-router-dom";
import { ProductNavigationContext } from "../prototype/Prototype";
import { categories } from "../prototype/model";
import { useCatalog } from "../catalog/context";
import { NotFound } from "../components/ui";

const navigation = {
  homePath: "/nirvana",
  listPath: (id: number) => `/nirvana/products/${categories.find(c => c.id === id)?.slug || categories[0].slug}`,
  detailPath: (id: string) => `/nirvana/products/item/${encodeURIComponent(id)}`,
  website: true,
};

export default function NirvanaProducts() {
  const catalog = useCatalog();
  if (!catalog.getProviderBySlug("nirvana")) return <NotFound />;
  return <ProductNavigationContext.Provider value={navigation}>
    <div className="fgp fgp-website">
      <Outlet />
    </div>
  </ProductNavigationContext.Provider>;
}
