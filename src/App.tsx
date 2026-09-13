import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { NotFound } from "./components/ui";
import Home from "./pages/Home";
import Nirvana from "./pages/Nirvana";
import Category from "./pages/Category";
import PackageDetail from "./pages/PackageDetail";
import Yunnan from "./pages/Yunnan";
import About from "./pages/About";
import Contact from "./pages/Contact";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/nirvana" element={<Nirvana />} />
          <Route path="/nirvana/packages/:slug" element={<PackageDetail />} />
          <Route path="/nirvana/:categoryId" element={<Category />} />
          <Route path="/yunnan-siantang" element={<Yunnan />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
