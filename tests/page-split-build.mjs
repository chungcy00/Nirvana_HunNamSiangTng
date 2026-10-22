import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
const routes = [
  "Home",
  "Nirvana",
  "NirvanaProducts",
  "Category",
  "PackageDetail",
  "Yunnan",
  "About",
  "Contact",
];
for (const name of routes)
  assert(manifest[`src/pages/${name}.tsx`]?.isDynamicEntry, name);
assert(manifest["src/prototype/Prototype.tsx"]?.isDynamicEntry);
const closure = (key, visited = new Set()) => {
  if (visited.has(key)) return visited;
  visited.add(key);
  for (const imported of manifest[key].imports || [])
    closure(imported, visited);
  return visited;
};
const bytes = (keys) =>
  [...keys].reduce(
    (total, key) =>
      total + gzipSync(readFileSync("dist/" + manifest[key].file)).length,
    0,
  );
const home = closure("src/pages/Home.tsx");
assert(!home.has("src/pages/Contact.tsx"));
assert(!home.has("src/prototype/Prototype.tsx"));
assert(!home.has("src/pages/About.tsx"));
assert.deepEqual(manifest["index.html"].css, ["assets/index-DvXrRKQF.css"]);
const before = gzipSync(
  readFileSync("work/catalog-security/before-page-split.js"),
).length;
const result = {
  method:
    "gzipSync of production JS; static dependency closures, not a measured browser load time",
  beforeEntryGzipBytes: before,
  afterEntryGzipBytes: bytes(closure("index.html")),
  afterHomeTotalGzipBytes: bytes(home),
  afterCatalogTotalGzipBytes: bytes(
    new Set([
      ...closure("src/pages/NirvanaProducts.tsx"),
      ...closure("src/prototype/Prototype.tsx"),
    ]),
  ),
  afterContactTotalGzipBytes: bytes(closure("src/pages/Contact.tsx")),
  unchangedStylesheet: manifest["index.html"].css[0],
  routeChunks: routes.map((name) => manifest[`src/pages/${name}.tsx`].file),
};
assert(result.afterHomeTotalGzipBytes < before);
writeFileSync(
  "work/catalog-security/page-split-build-result.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
