import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { navigation } from "../../data/site";
import { ConsultButton } from "../ui";
export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="身后事 · 皆可托，返回首页">
      <svg
        className="brand-logo"
        viewBox={footer ? "0 0 2048 768" : "42 268 1357 499"}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <image
          href={footer ? "/images/footer-brand-logo.png" : "/images/brand-logo.png"}
          width={footer ? 2048 : 1448}
          height={footer ? 768 : 1086}
        />
      </svg>
    </Link>
  );
}
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const home = location.pathname === "/";
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [location.pathname]);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) { drawer.current?.close(); return; }
    drawer.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 961px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);
  return (
    <header className={`site-header${home ? " site-header-home" : ""}${open ? " is-menu-open" : ""}${home && !scrolled && !open ? " is-transparent" : ""}`}>
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="主导航">
          {navigation.map((link) => (
            <NavLink end={link.to === "/"} key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-consult">
          <ConsultButton className="button-small" />
        </div>
        <button
          ref={toggle}
          type="button"
          className="menu-toggle"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          aria-controls="mobile-navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {typeof document !== "undefined" && createPortal(
        <dialog
          ref={drawer}
          id="mobile-navigation"
          className="mobile-menu-drawer"
          aria-labelledby="mobile-menu-title"
          onCancel={(event) => { event.preventDefault(); setOpen(false); }}
          onClose={() => { setOpen(false); toggle.current?.focus(); }}
          onClick={(event) => {
            if (event.target === event.currentTarget && event.clientX < event.currentTarget.getBoundingClientRect().left) setOpen(false);
          }}
        >
          <h2 id="mobile-menu-title" className="sr-only">网站导航</h2>
          <button type="button" className="menu-close" aria-label="关闭菜单" onClick={() => setOpen(false)}><X /></button>
          <nav aria-label="移动端导航" className="mobile-nav">
            {navigation.map((link) => (
              <NavLink end={link.to === "/"} key={link.to} to={link.to} onClick={() => setOpen(false)}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </dialog>, document.body
      )}
    </header>
  );
}
