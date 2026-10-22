import { useEffect, Suspense } from "react";
import PageLoadBoundary from "./PageLoadBoundary";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { questionnaireReturnKey } from "../../data/questionnaireReturn";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingConsult from "./FloatingConsult";
import { navigation } from "../../data/site";
function RouteEffects() {
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
    // Questionnaire results can arrive after the route's publication re-check.
    // That page owns the delayed restoration, including explicit result links.
    const questionnaireReturn = pathname === "/contact" && targetId.startsWith("needs-product-");
    if (questionnaireReturn) {
      // Keep native scrolling until the result has been rendered.
    } else if (target) {
      target.scrollIntoView({ block: "start", behavior: "instant" });
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }
    const page =
      (pathname.startsWith("/nirvana/products/") ? document.querySelector("#main-content h1")?.textContent : undefined) ||
      navigation.find((item) => item.to === pathname)?.label || "配套与服务";
    document.title = `${page}｜身后事 · 皆可托`;
  }, [pathname, hash, navigationType]);
  return null;
}

export default function AppLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳至主要内容
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <PageLoadBoundary resetKey={pathname}>
          <Suspense fallback={<div className="container section" style={{ minHeight: "100svh" }} role="status" aria-busy="true"><p>正在载入页面…</p></div>}>
            <Outlet />
            <RouteEffects />
          </Suspense>
        </PageLoadBoundary>
      </main>
      <Footer />
      <FloatingConsult />
    </>
  );
}
