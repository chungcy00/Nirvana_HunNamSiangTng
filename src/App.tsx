import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { PrototypeCatalog, PrototypeDetail, PrototypeLayout, PrototypeNotFound } from "./prototype/Prototype";
export function WebsiteRoutes() {
  return (
    <Routes>
      <Route path="/prototype" element={<PrototypeLayout />}>
        <Route index element={<PrototypeCatalog home />} />
        <Route path="list/:categorySlug" element={<PrototypeCatalog />} />
        <Route path="product/:productId" element={<PrototypeDetail />} />
        <Route path="*" element={<PrototypeNotFound />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/nirvana" element={<NirvanaProducts />}>
          <Route index element={<PrototypeCatalog home />} />
          <Route path="products/item/:productId" element={<PrototypeDetail />} />
          <Route path="products/:categorySlug" element={<PrototypeCatalog />} />
          <Route path="products/*" element={<PrototypeNotFound />} />
        </Route>
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
    <CatalogProvider>
      <BrowserRouter>
        <WebsiteRoutes />
      </BrowserRouter>
    </CatalogProvider>
  );
}
