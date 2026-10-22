import { lazy } from "react";
import { BrowserRouter } from "react-router-dom";
import { PublicCatalogProvider } from "./catalog/publicContext";
import { CatalogProvider } from "./catalog/context";
import { createWebsiteRoutes } from "./websiteRoutes";
// Keep the accepted global stylesheet order while splitting page JavaScript.
import "./prototype/prototype.css";
import "./pages/About.css";

export const WebsiteRoutes = createWebsiteRoutes({
  Home: lazy(() => import("./pages/Home")),
  Nirvana: lazy(() => import("./pages/Nirvana")),
  NirvanaProducts: lazy(() => import("./pages/NirvanaProducts")),
  Category: lazy(() => import("./pages/Category")),
  PackageDetail: lazy(() => import("./pages/PackageDetail")),
  Yunnan: lazy(() => import("./pages/Yunnan")),
  About: lazy(() => import("./pages/About")),
  Contact: lazy(() => import("./pages/Contact")),
  PrototypeCatalog: lazy(() =>
    import("./prototype/Prototype").then((page) => ({
      default: page.PrototypeCatalog,
    })),
  ),
  PrototypeDetail: lazy(() =>
    import("./prototype/Prototype").then((page) => ({
      default: page.PrototypeDetail,
    })),
  ),
  PrototypeNotFound: lazy(() =>
    import("./prototype/Prototype").then((page) => ({
      default: page.PrototypeNotFound,
    })),
  ),
});

export default function App() {
  return (
    <CatalogProvider>
      <BrowserRouter>
        <PublicCatalogProvider>
          <WebsiteRoutes />
        </PublicCatalogProvider>
      </BrowserRouter>
    </CatalogProvider>
  );
}
