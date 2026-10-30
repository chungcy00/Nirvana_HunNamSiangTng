import type { ComponentPropsWithoutRef } from "react";

// Native selects show :focus-visible after pointer clicks in some browsers.
// Track that interaction locally so keyboard navigation keeps its focus cue.
export function CatalogSortSelect(props: ComponentPropsWithoutRef<"select">) {
  return <select {...props}
    onPointerDown={event => { event.currentTarget.dataset.pointerFocus = "true"; props.onPointerDown?.(event); }}
    onKeyDown={event => { delete event.currentTarget.dataset.pointerFocus; props.onKeyDown?.(event); }}
    onBlur={event => { delete event.currentTarget.dataset.pointerFocus; props.onBlur?.(event); }}
  />;
}
