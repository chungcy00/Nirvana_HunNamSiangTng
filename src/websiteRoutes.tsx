import type { ComponentType } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { NotFound } from "./components/ui";
export type WebsitePages = {
  Home: ComponentType;
  Nirvana: ComponentType;
  NirvanaProducts: ComponentType;
  Category: ComponentType;
  PackageDetail: ComponentType;
  Yunnan: ComponentType;
  YunnanDetail: ComponentType;
  About: ComponentType;
  Contact: ComponentType;
  PrototypeCatalog: ComponentType<{ home?: boolean }>;
  PrototypeDetail: ComponentType;
  PrototypeNotFound: ComponentType;
};
function LegacyNirvanaDetail() {
  const { slug } = useParams();
  return (
    <Navigate
      to={`/nirvana/products/item/${encodeURIComponent(slug || "")}`}
      replace
    />
  );
}
export function createWebsiteRoutes(pages: WebsitePages) {
  return function WebsiteRoutes() {
    const {
      Home,
      Nirvana,
      NirvanaProducts,
      Category,
      PackageDetail,
      Yunnan,
      YunnanDetail,
      About,
      Contact,
      PrototypeCatalog,
      PrototypeDetail,
      PrototypeNotFound,
    } = pages;
    return (
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/nirvana" element={<NirvanaProducts />}>
            <Route index element={<PrototypeCatalog home />} />
            <Route
              path="products/item/:productId"
              element={<PrototypeDetail />}
            />
            <Route
              path="products/:categorySlug"
              element={<PrototypeCatalog />}
            />
            <Route path="products/*" element={<PrototypeNotFound />} />
          </Route>
          <Route
            path="/nirvana/packages/:slug"
            element={<LegacyNirvanaDetail />}
          />
          <Route
            path="/nirvana/:legacyCategory"
            element={<Navigate to="/nirvana" replace />}
          />
          <Route path="/:providerSlug" element={<Nirvana />} />
          <Route
            path="/:providerSlug/packages/:slug"
            element={<PackageDetail />}
          />
          <Route path="/:providerSlug/:categorySlug" element={<Category />} />
          <Route path="/yunnan-siantang" element={<Yunnan />} />
          <Route path="/yunnan-siantang/products/item/:productId" element={<YunnanDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    );
  };
}
