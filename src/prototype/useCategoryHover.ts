import { useEffect, useRef, type RefObject } from 'react';

// Keep the existing navigation and selection logic; animate only its backdrop.
export function useCategoryHover(containerRef: RefObject<HTMLDivElement | null>, enabled: boolean, activeKey: string | number | undefined, selectedSelector = '[aria-current="page"]') {
  const indicatorRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const container = containerRef.current, indicator = indicatorRef.current;
    if (!enabled || !container || !indicator) return;
    let target: HTMLButtonElement | null = null;
    const move = (button: HTMLButtonElement | null, visible: boolean) => {
      target = button;
      if (!button) return;
      indicator.style.setProperty('--hover-x', `${button.offsetLeft}px`);
      indicator.style.setProperty('--hover-y', `${button.offsetTop}px`);
      indicator.style.setProperty('--hover-width', `${button.offsetWidth}px`);
      indicator.style.setProperty('--hover-height', `${button.offsetHeight}px`);
      indicator.dataset.visible = String(visible && !button.matches(selectedSelector));
    };
    const reset = () => move(container.querySelector<HTMLButtonElement>(selectedSelector), false);
    const enter = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType !== 'mouse') return;
      const button = (event.target as Element).closest('button');
      if (button && container.contains(button)) move(button, true);
    };
    const focus = (event: Event) => {
      if ((event.target as Element).matches(':focus-visible')) enter(event);
    };
    const blur = (event: FocusEvent) => { if (!container.contains(event.relatedTarget as Node | null)) reset(); };
    const observer = new ResizeObserver(() => { if (target) move(target, indicator.dataset.visible === 'true'); });
    observer.observe(container);
    for (const button of container.querySelectorAll('button')) observer.observe(button);
    reset();
    container.addEventListener('pointerover', enter);
    container.addEventListener('pointerleave', reset);
    container.addEventListener('focusin', focus);
    container.addEventListener('focusout', blur);
    return () => {
      observer.disconnect();
      container.removeEventListener('pointerover', enter);
      container.removeEventListener('pointerleave', reset);
      container.removeEventListener('focusin', focus);
      container.removeEventListener('focusout', blur);
    };
  }, [containerRef, enabled, activeKey, selectedSelector]);
  return indicatorRef;
}
