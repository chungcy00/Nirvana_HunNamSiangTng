import type { Plugin } from "vite";

// Resolve hashed files at build time. Only hint the route being opened, so
// unrelated page modules remain lazy and the same picture source is requested.
export function pagePreloads(): Plugin {
  return {
    name: "current-page-preloads",
    transformIndexHtml: {
      order: "post",
      handler(_html, context) {
        if (!context.bundle) return;
        const bundle = context.bundle;
        const pages: Record<string, string[]> = {};
        for (const name of ["Home", "Nirvana", "NirvanaProducts", "Category", "PackageDetail", "Yunnan", "About", "Contact", "Prototype"]) {
          const chunk = Object.values(bundle).find(item => item.type === "chunk" && item.facadeModuleId?.endsWith(`/${name}.tsx`));
          if (!chunk || chunk.type !== "chunk") continue;
          const files = new Set<string>();
          const visit = (file: string) => {
            if (files.has(file)) return;
            const item = bundle[file];
            if (!item || item.type !== "chunk" || item.isEntry) return;
            files.add(file);
            item.imports.forEach(visit);
          };
          visit(chunk.fileName);
          pages[name] = [...files].map(file => `/${file}`);
        }
        return [{
          tag: "script",
          attrs: { id: "route-resource-hints" },
          injectTo: "head-prepend",
          children: `(function(){
var pages=${JSON.stringify(pages)}, path=location.pathname.replace(/\\/+$/, '')||'/';
var names=path==='/'?['Home']:path==='/contact'?['Contact']:path==='/about'?['About']:path==='/yunnan-siantang'?['Yunnan']:path==='/nirvana'||path.indexOf('/nirvana/')===0?['NirvanaProducts','Prototype']:path.split('/').filter(Boolean).length===1?['Nirvana']:path.indexOf('/packages/')!==-1?['PackageDetail']:['Category'];
var seen={};
names.forEach(function(name){(pages[name]||[]).forEach(function(url){if(seen[url])return;seen[url]=true;var link=document.createElement('link');link.rel='modulepreload';link.href=url;link.crossOrigin='';document.head.appendChild(link);});});
if(path==='/'){
var mobile=matchMedia('(orientation: portrait) and (max-width: 1024px)').matches;
var tablet=matchMedia('(orientation: landscape) and (min-width: 768px) and (max-width: 1366px) and (min-height: 561px) and (any-pointer: coarse)').matches||matchMedia('(orientation: landscape) and (min-width: 768px) and (max-width: 1024px) and (min-height: 561px)').matches;
var hero=document.createElement('link');hero.rel='preload';hero.as='image';hero.href='/images/home-hero'+(mobile?'-mobile':tablet?'-tablet':'')+'.webp';hero.fetchPriority='high';document.head.appendChild(hero);
}
})();`,
        }];
      },
    },
  };
}
