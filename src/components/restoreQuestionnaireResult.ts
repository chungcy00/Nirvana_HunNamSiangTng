// Let the route commit and native history scroll restoration finish first.
// The existing scroll-margin-top keeps the result below the fixed header.
export function restoreQuestionnaireResult(
  target: Pick<HTMLElement, "scrollIntoView" | "focus">,
  completed: () => void,
  behavior: ScrollBehavior = "instant",
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
) {
  let frame = requestFrame(() => {
    frame = requestFrame(() => {
      target.scrollIntoView({ block: "start", behavior });
      target.focus({ preventScroll: true });
      completed();
    });
  });
  return () => cancelFrame(frame);
}
