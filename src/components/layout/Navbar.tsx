import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { navigation } from "../../data/site";
import { ConsultButton } from "../ui";
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="身后规划服务，返回首页">
      <span className="brand-mark">LOGO</span>
      <span>
        身后规划服务<small>LIFE · CARE · LEGACY</small>
      </span>
    </Link>
  );
}
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <header className="site-header">
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
      <nav
        id="mobile-navigation"
        aria-label="移动端导航"
        className="mobile-nav"
        hidden={!open}
      >
        {navigation.map((link) => (
          <NavLink end={link.to === "/"} key={link.to} to={link.to}>
            {link.label}
          </NavLink>
        ))}
        <ConsultButton />
      </nav>
    </header>
  );
}
