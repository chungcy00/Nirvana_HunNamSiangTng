import { useEffect, useRef, useState, useContext } from "react";
import { acquireImage } from "./imageResource";
import { ImageScopeContext } from './ImageScope';
export function useVisibleImage(
  identity: string,
  load: (width: number, signal: AbortSignal) => Promise<Blob>,
  keepAliveMs = 0,
) {
  const scope=useContext(ImageScopeContext);
  const target = useRef<HTMLElement | null>(null);
  const [source, setSource] = useState({ identity: "", url: "" });
  useEffect(() => {
    const node = target.current;
    if (!node || !identity) return;
    let active = true,
      resource: ReturnType<typeof acquireImage> | undefined;
    const start = () => {
      if (resource || !active) return;
      const pixels =
        Math.max(
          node.getBoundingClientRect().width,
          node.getBoundingClientRect().height,
        ) * Math.min(node.ownerDocument.defaultView?.devicePixelRatio || 1, 2);
      // Detail scopes download each clear variant once for thumbnails, main
      // photos and zoom. Lists outside the scope retain small lazy thumbnails.
      const width = scope ? 1920 :
        [160, 480, 960, 1920].find((size) => size >= pixels) || 1920;
      resource = scope ? scope.acquire(`${identity}:${width}`,signal=>load(width,signal)) : acquireImage(
        `${identity}:${width}`,
        (signal) => load(width, signal),
        keepAliveMs,
      );
      resource.promise.then(
        (url) => {
          if (active) setSource({ identity, url });
        },
        () => {
          if (active) setSource({ identity, url: "" });
        },
      );
    };
    const Observer = node.ownerDocument.defaultView?.IntersectionObserver;
    const observer = Observer
      ? new Observer(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              start();
              observer?.disconnect();
            }
          },
          { rootMargin: "200px" },
        )
      : undefined;
    if (scope) start();
    else if (observer) observer.observe(node);
    else start();
    return () => {
      active = false;
      observer?.disconnect();
      resource?.release();
    };
  }, [identity, load, keepAliveMs, scope]);
  return { target, url: source.identity === identity ? source.url : "" };
}
