import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { PublicCatalogContext } from "../src/catalog/publicContext";
import type { PublicSnapshot } from "../src/catalog/publicRefresh";
import { WebsiteRoutes } from "./eagerWebsiteRoutes";

function render(snapshot: PublicSnapshot) {
  return renderToStaticMarkup(<PublicCatalogContext.Provider value={{ ...snapshot, retry: () => {} }}><MemoryRouter initialEntries={["/nirvana"]}><WebsiteRoutes/></MemoryRouter></PublicCatalogContext.Provider>);
}
test("a returning empty catalogue renders identically while checking, without a loading flash", () => {
  const ready = render({ products: [], status: "ready" });
  const checking = render({ products: [], status: "loading", refreshingEmpty: true });
  assert.equal(checking, ready);
  assert.match(checking, /当前分类暂无产品/);
  assert.doesNotMatch(checking, /正在载入产品资料/);
});
test("initial load, failure and unvalidated empty records retain their truthful feedback", () => {
  assert.match(render({ products: [], status: "loading" }), /正在载入产品资料/);
  const error = render({ products: [], status: "error", refreshingEmpty: true });
  assert.match(error, /产品资料暂时无法载入/);
  assert.doesNotMatch(error, /当前分类暂无产品/);
});
