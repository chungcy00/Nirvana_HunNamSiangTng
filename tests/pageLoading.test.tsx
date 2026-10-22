import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { WebsiteRoutes } from "../src/App";
import { PublicFixture } from "./publicFixtures";

function renderLoaded(path: string) {
  return new Promise<string>((resolve, reject) => {
    const output = new PassThrough();
    let html = "";
    output.on("data", (part) => {
      html += part;
    });
    output.on("end", () => resolve(html));
    output.on("error", reject);
    const stream = renderToPipeableStream(
      <PublicFixture>
        <MemoryRouter initialEntries={[path]}>
          <WebsiteRoutes />
        </MemoryRouter>
      </PublicFixture>,
      {
        onAllReady() {
          stream.pipe(output);
        },
        onError: reject,
      },
    );
  });
}
for (const [path, expected] of [
  ["/", /归于土，化于风，安于心/],
  ["/nirvana?category=2", /家庭福地 · W区/],
  ["/nirvana/products/item/w-family-lot", /产品价格/],
  ["/nirvana/products/item/funeral-1-1", /殡仪服务价格/],
  ["/contact#needs-questionnaire", /直接咨询顾问[\s\S]*了解您的需求/],
  ["/about", /钟永新/],
  ["/yunnan-siantang", /云南善堂/],
] as const)
  test(`actual lazy route resolves without losing content: ${path}`, async () => {
    const html = await renderLoaded(path);
    assert.match(html, expected);
    // React streaming output can retain the initial fallback plus a resolved segment.
    assert.doesNotMatch(html, /页面暂时无法载入/);
    if (path.includes("funeral-1-1"))
      assert.doesNotMatch(html, /fgp-gallery|fgp-image-large/);
  });
