import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const html = readFileSync('dist/index.html', 'utf8');
const script = html.match(/<script id="route-resource-hints">([\s\S]*?)<\/script>/)?.[1];
assert(script, 'production HTML contains early resource hints');
assert(html.indexOf('route-resource-hints') < html.indexOf('type="module"'));
assert(html.indexOf('name="viewport"') < html.indexOf('route-resource-hints'));
assert(html.indexOf('charset="UTF-8"') < 1024);
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
function hints(pathname, device = 'desktop') {
  const links = [];
  runInNewContext(script, {
    location: { pathname },
    matchMedia: query => ({ matches: device === 'mobile' ? query.includes('orientation: portrait') : device === 'tablet' && query.includes('any-pointer: coarse') }),
    document: { createElement: tag => { assert.equal(tag, 'link'); return {}; }, head: { appendChild: link => links.push(link) } },
  });
  for (const link of links) assert(existsSync('dist' + link.href), link.href);
  assert.equal(new Set(links.map(link => link.href)).size, links.length, 'no duplicate hints');
  return links;
}
for (const [path, names] of [
  ['/', ['Home']], ['/contact', ['Contact']], ['/about/', ['About']],
  ['/nirvana', ['NirvanaProducts']], ['/nirvana/products/item/example', ['NirvanaProducts']],
  ['/yunnan-siantang', ['Yunnan']], ['/provider', ['Nirvana']],
  ['/provider/packages/example', ['PackageDetail']], ['/provider/category', ['Category']],
]) {
  const links = hints(path);
  for (const name of names) assert(links.some(link => link.href === '/' + manifest[`src/pages/${name}.tsx`].file), path + ': ' + name);
  if (path !== '/contact') assert(!links.some(link => link.href === '/' + manifest['src/pages/Contact.tsx'].file));
  if (!path.startsWith('/nirvana')) assert(!links.some(link => link.href === '/' + manifest['src/prototype/Prototype.tsx'].file));
  if (path !== '/') assert(!links.some(link => link.as === 'image'), 'no hero download on other routes');
}
for (const [device, suffix] of [['mobile', '-mobile'], ['tablet', '-tablet'], ['desktop', '']]) {
  const images = hints('/', device).filter(link => link.as === 'image');
  assert.equal(images.length, 1);
  assert.equal(images[0].href, '/images/home-hero' + suffix + '.webp');
  assert.equal(images[0].fetchPriority, 'high');
}
console.log('Passed production preload routing, hashed file existence, no unrelated chunks, and one matching hero per device.');
