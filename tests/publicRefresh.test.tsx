import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPublicRefresh, type PublicSnapshot } from "../src/catalog/publicRefresh";
import { prototypeProducts } from "../src/prototype/products";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const product = prototypeProducts[0];

test("background refresh retains a ready catalogue until validated replacement arrives", async () => {
  const states: PublicSnapshot[] = [];
  let next = deferred<readonly typeof product[]>();
  const refresh = createPublicRefresh({ load: () => next.promise, publish: s => states.push(s) });
  const initial = refresh.refresh();
  assert.equal(states.at(-1)?.status, "loading");
  next.resolve([product]); await initial;
  const ready = states.at(-1);
  next = deferred();
  const background = refresh.refresh({ force: true });
  assert.strictEqual(states.at(-1), ready);
  next.resolve([]); await background;
  assert.equal(states.at(-1)?.status, "ready");
  assert.deepEqual(states.at(-1)?.products, []); // Removed products do not linger.
  refresh.dispose();
});

test("overlapping and clustered focus/visibility events share one request", async () => {
  let calls = 0, clock = 0;
  const first = deferred<readonly typeof product[]>();
  const refresh = createPublicRefresh({
    now: () => clock, load: () => { calls++; return first.promise; }, publish: () => {},
  });
  const request = refresh.refresh();
  assert.strictEqual(refresh.refresh(), request);
  assert.strictEqual(refresh.refresh({ force: true }), request);
  first.resolve([product]); await request;
  assert.equal(calls, 1);
  clock = 999; await refresh.refresh(); assert.equal(calls, 1);
  clock = 1000; await refresh.refresh(); assert.equal(calls, 2);
  refresh.dispose();
});

test("failed refresh clears old products and explicit retry ignores event cooldown", async () => {
  const states: PublicSnapshot[] = [];
  let fail = false;
  const refresh = createPublicRefresh({
    now: () => 0, load: async () => { if (fail) throw new Error("offline"); return [product]; },
    publish: s => states.push(s),
  });
  await refresh.refresh(); fail = true; await refresh.refresh({ force: true });
  assert.equal(states.at(-1)?.status, "error");
  assert.deepEqual(states.at(-1)?.products, []);
  fail = false;
  const retry = refresh.refresh({ force: true });
  assert.equal(states.at(-1)?.status, "loading");
  await retry; assert.equal(states.at(-1)?.status, "ready");
  refresh.dispose();
});

test("a stalled refresh times out and hides stale products even if loader ignores abort", async () => {
  const states: PublicSnapshot[] = [];
  let stall = false;
  const refresh = createPublicRefresh({
    timeoutMs: 10,
    load: () => stall ? new Promise(() => {}) : Promise.resolve([product]),
    publish: s => states.push(s),
  });
  await refresh.refresh(); stall = true; await refresh.refresh({ force: true });
  assert.equal(states.at(-1)?.status, "error");
  assert.deepEqual(states.at(-1)?.products, []);
  refresh.dispose();
});

test("unmount aborts work and prevents late writes from reviving an old session", async () => {
  const states: PublicSnapshot[] = [];
  const late = deferred<readonly typeof product[]>();
  const refresh = createPublicRefresh({ load: () => late.promise, publish: s => states.push(s) });
  const request = refresh.refresh(); refresh.dispose();
  late.resolve([product]); await request;
  assert.equal(states.length, 1);
  await refresh.refresh({ force: true }); assert.equal(states.length, 1);
});

test("long-lived cache rules match only hashed JS/CSS, never HTML, images or APIs", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const rules = config.headers.filter((r: any) => r.headers.some((h: any) => h.key === "Cache-Control"));
  const patterns = rules.map((r: any) => new RegExp("^" + r.source.replace(":file(", "(") + "$"));
  for (const asset of ["/assets/index-CuMikJ_w.js", "/assets/index-DvXrRKQF.css"])
    assert(patterns.some((r: RegExp) => r.test(asset)), asset);
  for (const path of ["/", "/nirvana", "/index.html", "/assets/index.js", "/images/brand-logo.png", "/rest/v1/rpc/catalog_product_list", "/api/media"])
    assert(!patterns.some((r: RegExp) => r.test(path)), path);
  for (const rule of rules) assert.equal(rule.headers[0].value, "public, max-age=31536000, immutable");
});

test("route changes retain a foreground publication check even during a background request", async () => {
  const states: PublicSnapshot[] = [];
  let next = deferred<readonly typeof product[]>();
  const refresh = createPublicRefresh({ load: () => next.promise, publish: s => states.push(s) });
  const first = refresh.refresh(); next.resolve([product]); await first;
  next = deferred();
  const pending = refresh.refresh({ force: true });
  assert.strictEqual(refresh.refresh({ force: true, foreground: true }), pending);
  assert.equal(states.at(-1)?.status, "loading");
  assert.deepEqual(states.at(-1)?.products, []);
  next.resolve([]); await pending;
  assert.equal(states.at(-1)?.status, "ready");
  assert.deepEqual(states.at(-1)?.products, []);
  refresh.dispose();
});

test("returning to a validated empty catalogue preserves only its empty presentation during revalidation", async () => {
  const states: PublicSnapshot[] = [];
  let next = deferred<readonly typeof product[]>();
  const refresh = createPublicRefresh({ load: () => next.promise, publish: s => states.push(s) });
  const initial = refresh.refresh();
  assert.equal(states.at(-1)?.refreshingEmpty, undefined);
  next.resolve([]); await initial;
  next = deferred();
  const check = refresh.refresh({ force: true, foreground: true });
  assert.equal(states.at(-1)?.status, "loading"); // Still pending validation.
  assert.equal(states.at(-1)?.refreshingEmpty, true);
  assert.deepEqual(states.at(-1)?.products, []);
  assert.strictEqual(refresh.refresh({ force: true, foreground: true }), check);
  next.resolve([product]); await check;
  assert.equal(states.at(-1)?.status, "ready");
  assert.equal(states.at(-1)?.refreshingEmpty, undefined);
  assert.deepEqual(states.at(-1)?.products, [product]); // New publications appear.
  next = deferred();
  const productCheck = refresh.refresh({ force: true, foreground: true });
  assert.equal(states.at(-1)?.refreshingEmpty, undefined);
  assert.deepEqual(states.at(-1)?.products, []); // Old products are still hidden.
  next.reject(new Error("offline")); await productCheck;
  assert.equal(states.at(-1)?.status, "error");
  refresh.dispose();
});

test("failed empty-list revalidation removes the empty-view hint and permits retry", async () => {
  const states: PublicSnapshot[] = [];
  let next = deferred<readonly typeof product[]>();
  const refresh = createPublicRefresh({ load: () => next.promise, publish: s => states.push(s) });
  const initial = refresh.refresh(); next.resolve([]); await initial;
  next = deferred();
  const check = refresh.refresh({ force: true, foreground: true });
  next.reject(new Error("offline")); await check;
  assert.equal(states.at(-1)?.status, "error");
  assert.equal(states.at(-1)?.refreshingEmpty, undefined);
  assert.deepEqual(states.at(-1)?.products, []);
  next = deferred();
  const retry = refresh.refresh({ force: true });
  assert.equal(states.at(-1)?.status, "loading");
  assert.equal(states.at(-1)?.refreshingEmpty, undefined);
  next.resolve([]); await retry;
  assert.equal(states.at(-1)?.status, "ready");
  refresh.dispose();
});

test("warm snapshots stay visible during revalidation and navigation events respect the reuse window", async () => {
  const states: PublicSnapshot[] = [];
  let clock=0, calls=0;
  const pending=deferred<readonly typeof product[]>();
  const refresh=createPublicRefresh({initialProducts:[product],cooldownMs:15000,now:()=>clock,load:()=>{calls++;return pending.promise;},publish:s=>states.push(s)});
  const check=refresh.refresh();
  assert.equal(states.length,0,'warm catalogue is not cleared before background validation');
  assert.strictEqual(refresh.refresh(),check);
  pending.resolve([product]);await check;
  clock=14999;await refresh.refresh();assert.equal(calls,1);
  clock=15000;await refresh.refresh();assert.equal(calls,2);
  refresh.dispose();
});
