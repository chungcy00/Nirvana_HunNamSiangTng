import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreQuestionnaireResult } from "../src/components/restoreQuestionnaireResult";

function setup(behavior: ScrollBehavior = "instant") {
  let next = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const calls: unknown[] = [];
  const request = (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; };
  const cancel = (id: number) => { frames.delete(id); };
  const flush = () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(0)); };
  const stop = restoreQuestionnaireResult({ scrollIntoView: options => calls.push(options), focus: options => calls.push(options) }, () => calls.push("completed"), behavior, request, cancel);
  return { calls, flush, stop };
}
test("result restoration waits for history and layout, then preserves CSS offset and focus", () => {
  const { calls, flush } = setup();
  assert.deepEqual(calls, []);
  flush();
  assert.deepEqual(calls, []);
  flush();
  assert.deepEqual(calls, [{ block: "start", behavior: "instant" }, { preventScroll: true }, "completed"]);
});
test("explicit result links retain the stylesheet's configured scrolling behavior", () => {
  const { calls, flush } = setup("auto");
  flush(); flush();
  assert.deepEqual(calls[0], { block: "start", behavior: "auto" });
});
for (const afterFirstFrame of [false, true]) test(`leaving the route cancels pending result scrolling (first frame: ${afterFirstFrame})`, () => {
  const { calls, flush, stop } = setup();
  if (afterFirstFrame) flush();
  stop(); flush(); flush();
  assert.deepEqual(calls, []);
});
