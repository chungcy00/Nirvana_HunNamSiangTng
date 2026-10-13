import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { navigation } from "../../data/site";
export default function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main-content")?.focus({ preventScroll: true });
    const page =
      navigation.find((item) => item.to === pathname)?.label || "配套与服务";
    document.title = `${page}｜身后事 · 皆可托`;
  }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳至主要内容
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
