import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { PublicCatalogProvider } from "./catalog/publicContext";
import { CatalogProvider } from "./catalog/context";
import AppLayout from "./components/layout/AppLayout";
import { NotFound } from "./components/ui";
import Home from "./pages/Home";
import Nirvana from "./pages/Nirvana";
import NirvanaProducts from "./pages/NirvanaProducts";
import Category from "./pages/Category";
import PackageDetail from "./pages/PackageDetail";
import Yunnan from "./pages/Yunnan";
import About from "./pages/About";
import Contact from "./pages/Contact";
import { PrototypeCatalog, PrototypeDetail, PrototypeNotFound } from "./prototype/Prototype";
function LegacyNirvanaDetail(){const {slug}=useParams();return <Navigate to={`/nirvana/products/item/${encodeURIComponent(slug || "")}`} replace/>;}
export function WebsiteRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/nirvana" element={<NirvanaProducts />}>
          <Route index element={<PrototypeCatalog home />} />
          <Route path="products/item/:productId" element={<PrototypeDetail />} />
          <Route path="products/:categorySlug" element={<PrototypeCatalog />} />
          <Route path="products/*" element={<PrototypeNotFound />} />
        </Route>
        <Route path="/nirvana/packages/:slug" element={<LegacyNirvanaDetail />} />
        <Route path="/nirvana/:legacyCategory" element={<Navigate to="/nirvana" replace />} />
        <Route path="/:providerSlug" element={<Nirvana />} />
        <Route
          path="/:providerSlug/packages/:slug"
          element={<PackageDetail />}
        />
        <Route path="/:providerSlug/:categorySlug" element={<Category />} />
        <Route path="/yunnan-siantang" element={<Yunnan />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <CatalogProvider><BrowserRouter>
      <PublicCatalogProvider>
        <WebsiteRoutes />
      </PublicCatalogProvider>
    </BrowserRouter></CatalogProvider>
  );
}
