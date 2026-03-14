export default function equalInnerHTML(
  assert: QUnit['assert'],
  fragment: HTMLElement,
  html: string
) {
  let actualHTML = fragment.innerHTML;

  assert.pushResult({
    result: actualHTML === html,
    actual: actualHTML,
    expected: html,
    message: "innerHTML doesn't match",
  });
}
