import { useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { questionnaireReturnKey } from "../../data/questionnaireSession";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingConsult from "./FloatingConsult";
import { navigation } from "../../data/site";
export default function AppLayout() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    let returnId = "";
    if (pathname === "/contact") {
      try {
        if (navigationType === "POP") returnId = sessionStorage.getItem(questionnaireReturnKey) || "";
        sessionStorage.removeItem(questionnaireReturnKey);
      } catch { /* Browser storage is optional. */ }
    }
    const targetId = returnId || (hash ? decodeURIComponent(hash.slice(1)) : "");
    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      target.scrollIntoView({ block: "start", behavior: "instant" });
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }
    const page =
      navigation.find((item) => item.to === pathname)?.label || "配套与服务";
    document.title = `${page}｜身后事 · 皆可托`;
  }, [pathname, hash, navigationType]);
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
      <FloatingConsult />
    </>
  );
}
