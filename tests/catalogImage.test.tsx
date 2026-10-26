import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import sharp from "sharp";
import { createImageHandler } from "../apps/admin/server/catalogImage";
import { acquireImage,createImageScope } from "../shared/imageResource";

test("resized images preserve colour, authorize warm hits and never expose restricted originals", async () => {
  const original = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 230, g: 20, b: 30 },
    },
  })
    .jpeg()
    .toBuffer();
  let allowed = true,
    heads = 0,
    downloads = 0,
    version = "one";
  const handler = createImageHandler({
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
    fetch: (async (url, options) => {
      assert(
        String(url).startsWith(
          "https://example.supabase.co/storage/v1/object/authenticated/catalog-media-private/",
        ),
      );
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        "Bearer member-token",
      );
      assert.equal(options?.cache, "no-store");
      if (options?.method === "HEAD") heads++;
      else downloads++;
      return allowed
        ? new Response(options?.method === "HEAD" ? null : original, {
            status: 200,
            headers: {
              "content-type": "image/jpeg",
              etag: version,
              "content-length": String(original.length),
            },
          })
        : new Response(null, { status: 403 });
    }) as typeof fetch,
  });
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/?bucket=catalog-media-private&path=product/photo.jpg&width=160`;
  try {
    for (let i = 0; i < 2; i++) {
      const response = await fetch(url, {
        headers: { Authorization: "Bearer member-token" },
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control")!, /no-store/);
      const data = Buffer.from(await response.arrayBuffer()),
        meta = await sharp(data).metadata();
      assert.equal(meta.width, 160);
      assert.equal(meta.height, 120);
      const rgb = await sharp(data).raw().toBuffer();
      assert(rgb[0] > rgb[1] + 100, "original colour preserved");
    }
    assert.equal(heads, 2);
    assert.equal(
      downloads,
      1,
      "only resized bytes are cached after authorization",
    );
    version = "two";
    await fetch(url, { headers: { Authorization: "Bearer member-token" } });
    assert.equal(downloads, 2, "new source version invalidates resize");
    allowed = false;
    const revoked = await fetch(url, {
      headers: { Authorization: "Bearer member-token" },
    });
    assert.equal(revoked.status, 404);
    assert.equal((await revoked.arrayBuffer()).byteLength, 0);
    const before = heads;
    assert.equal(
      (await fetch(url.replace("photo.jpg", "%2E%2E%2Fsecret"))).status,
      400,
    );
    assert.equal(
      (await fetch(url.replace("width=160", "width=99999"))).status,
      400,
    );
    assert.equal(heads, before);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test("mounted image consumers share one download and cancel/revoke only after the last release", async () => {
  let calls = 0,
    signal: AbortSignal | undefined;
  const load = async (s: AbortSignal) => {
    calls++;
    signal = s;
    return new Blob(["test"], { type: "image/webp" });
  };
  const first = acquireImage("same-image", load),
    second = acquireImage("same-image", load);
  const a = await first.promise,
    b = await second.promise;
  assert.equal(a, b);
  assert.equal(calls, 1);
  first.release();
  assert.equal(signal?.aborted, false);
  second.release();
  assert.equal(signal?.aborted, true);
  const third = acquireImage("same-image", load);
  await third.promise;
  assert.equal(calls, 2);
  third.release();
});

test("stored previews bypass on-demand processing and preserve fresh storage authorization", async () => {
  const { fetchPreviewImage } = await import("../shared/imageResource");
  const { storedPreviewPath } = await import("../shared/imageVariants");
  assert.equal(
    storedPreviewPath("catalog-media-private", "product/photo.jpg", 160),
    "160/catalog-media-private/product/photo.jpg.webp",
  );
  assert.throws(() =>
    storedPreviewPath("catalog-media-private", "../secret", 160),
  );
  const previous = globalThis.fetch,
    calls: string[] = [];
  try {
    globalThis.fetch = (async (url, options) => {
      calls.push(String(url));
      assert.equal(options?.cache, "no-store");
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        "Bearer member",
      );
      return new Response(new Blob(["small"], { type: "image/webp" }), {
        headers: { "Content-Type": "image/webp" },
      });
    }) as typeof fetch;
    const result = await fetchPreviewImage(
      "catalog-media-private",
      "product/photo.jpg",
      160,
      { Authorization: "Bearer member" },
      "https://example.supabase.co/storage/v1/object/authenticated/catalog-media-private/product/photo.jpg",
      new AbortController().signal,
    );
    assert.equal(await result.text(), "small");
    assert.equal(calls.length, 1);
    assert.match(
      calls[0],
      /object\/authenticated\/catalog-media-previews\/160\//,
    );
    assert(!calls[0].includes("/api/catalog-image"));
  } finally {
    globalThis.fetch = previous;
  }
});
test("server stores only the authorized generated derivative without replacing the original", async () => {
  const input = await sharp({
    create: { width: 200, height: 100, channels: 3, background: "#cc3344" },
  })
    .png()
    .toBuffer();
  let writes = 0, placeholders = 0;
  const handler = createImageHandler({
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-test",
    },
    fetch: (async (url, options) => {
      if (options?.method === "POST") {
        if (String(url).endsWith('/rpc/cache_image_placeholder')) {
          placeholders++;
          const body = JSON.parse(String(options.body));
          assert.equal(body.p_bucket, 'catalog-media-private');
          assert.equal(body.p_path, 'product/photo.png');
          const metadata = await sharp(Buffer.from(body.p_data.split(',')[1], 'base64')).metadata();
          assert.equal(metadata.width,160);
          assert.equal((options.headers as Record<string,string>)['Content-Profile'],'api');
          return new Response(null,{status:204});
        }
        writes++;
        assert.match(
          String(url),
          /object\/catalog-media-previews\/160\/catalog-media-private\/product\/photo.png.webp$/,
        );
        assert.equal(
          (options?.headers as Record<string, string>).Authorization,
          "Bearer server-only-test",
        );
        assert.equal(
          (options?.headers as Record<string, string>)["x-upsert"],
          "false",
        );
        assert.equal(
          (await sharp(Buffer.from(options.body as Uint8Array)).metadata())
            .width,
          160,
        );
        return new Response("{}", { status: 200 });
      }
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        "Bearer member",
      );
      return new Response(options?.method === "HEAD" ? null : input, {
        headers: {
          "Content-Type": "image/png",
          etag: "one",
          "Content-Length": String(input.length),
        },
      });
    }) as typeof fetch,
  });
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as { port: number }).port}/?bucket=catalog-media-private&path=product/photo.png&width=160`,
      { headers: { Authorization: "Bearer member" } },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-preview-stored"), "1");
    assert.equal(writes, 1);
    assert.equal(placeholders,1);
    assert.equal(response.headers.get('x-placeholder-stored'),'1');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('brief admin memory reuse avoids return-navigation downloads and expires automatically',async()=>{
 let calls=0;
 const load=async()=>{calls++;return new Blob(['thumbnail'],{type:'image/webp'});};
 const first=acquireImage('admin-return-photo',load,30);const url=await first.promise;first.release();
 const second=acquireImage('admin-return-photo',load,30);assert.equal(await second.promise,url);assert.equal(calls,1);second.release();
 await new Promise(resolve=>setTimeout(resolve,50));
 const third=acquireImage('admin-return-photo',load);await third.promise;assert.equal(calls,2);third.release();
});

test('a product scope retains completed and pending photos across repeated gallery switches and releases on leave',async()=>{
 const scope=createImageScope();let calls=0;let unblock!:()=>void;
 const gate=new Promise<void>(resolve=>{unblock=resolve;});
 const load=async()=>{calls++;await gate;return new Blob(['photo'],{type:'image/webp'});};
 const first=scope.acquire('gallery-photo',load);first.release();
 const second=scope.acquire('gallery-photo',load);unblock();const url=await second.promise;second.release();
 for(let i=0;i<6;i++){const again=scope.acquire('gallery-photo',load);assert.equal(await again.promise,url);again.release();}
 assert.equal(calls,1);scope.dispose();
 const nextProduct=acquireImage('gallery-photo',load);await nextProduct.promise;assert.equal(calls,2);nextProduct.release();
});
