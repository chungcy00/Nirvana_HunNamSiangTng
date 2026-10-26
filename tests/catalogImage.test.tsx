import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import sharp from "sharp";
import { createImageHandler } from "../apps/admin/server/catalogImage";
import { acquireImage } from "../shared/imageResource";

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
