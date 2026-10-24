import { useEffect, useRef } from "react";

// CSS keeps the panel inside the detail grid. Measure only on resize/content
// changes, so taller notes and zoom never leave part of the card unreachable.
export function useBoundedPricePanel(enabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = ref.current;
    if (!enabled || !panel) return;
    const doc = panel.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;
    const header = doc.querySelector<HTMLElement>(".site-header, .fgp-header");
    const update = () => {
      const top = (header?.getBoundingClientRect().height || 0) + 16;
      panel.style.setProperty("--service-sticky-top", `${top}px`);
      panel.dataset.sticky = String(
        view.innerWidth >= 1024 &&
          panel.getBoundingClientRect().height <= view.innerHeight - top - 16,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    if (header) observer.observe(header);
    view.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      view.removeEventListener("resize", update);
      delete panel.dataset.sticky;
      panel.style.removeProperty("--service-sticky-top");
    };
  }, [enabled]);
  return ref;
}
