import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ConsultButton } from "../ui";

export default function FloatingConsult() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const container = useRef<HTMLDivElement>(null);
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    if (isMobile) return;
    let frame = 0;
    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      "main a, main button, main input, main select, main textarea, main h1, main h2, main h3, main p, .site-footer",
    ));
    const measure = () => {
      frame = 0;
      const floating = container.current?.getBoundingClientRect();
      if (!floating) return;
      // Keep a small buffer so the floating control never touches an action.
      setObscured(targets.some((target) => {
        const box = target.getBoundingClientRect();
        return box.width > 0 && box.height > 0 &&
          box.left < floating.right + 8 && box.right > floating.left - 8 &&
          box.top < floating.bottom + 8 && box.bottom > floating.top - 8;
      }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    if (container.current) observer.observe(container.current);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [location.key, isMobile]);

  if (isMobile) return null;

  return (
    <div ref={container} className="floating-consult-container" data-obscured={obscured} inert={obscured}>
      <ConsultButton className="floating-consult">
        <span className="sr-only">直接咨询顾问</span>
      </ConsultButton>
    </div>
  );
}
