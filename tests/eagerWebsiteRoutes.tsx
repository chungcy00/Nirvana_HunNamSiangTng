// Static SSR assertions use the same route map with already-loaded pages.
// Browser tests exercise the actual lazy-loaded production route components.
import { createWebsiteRoutes } from "../src/websiteRoutes";
import Home from "../src/pages/Home";
import Nirvana from "../src/pages/Nirvana";
import NirvanaProducts from "../src/pages/NirvanaProducts";
import Category from "../src/pages/Category";
import PackageDetail from "../src/pages/PackageDetail";
import Yunnan, { YunnanDetail } from "../src/pages/Yunnan";
import About from "../src/pages/About";
import Contact from "../src/pages/Contact";
import {
  PrototypeCatalog,
  PrototypeDetail,
  PrototypeNotFound,
} from "../src/prototype/Prototype";
export const WebsiteRoutes = createWebsiteRoutes({
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
});
