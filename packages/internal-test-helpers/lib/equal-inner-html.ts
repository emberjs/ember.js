function normalizeInnerHTML(actualHTML: string) {
  // Strip GXT rendering artifacts
  if ((globalThis as any).__GXT_MODE__) {
    actualHTML = actualHTML
      .replace(/<!--(?:placeholder|if-entry|each-entry|list-target)[^>]*-->/g, '')
      .replace(/\s*data-node-id="[^"]*"/g, '');
  }

  return actualHTML;
}

export default function equalInnerHTML(
  assert: QUnit['assert'],
  fragment: HTMLElement,
  html: string
) {
  let actualHTML = normalizeInnerHTML(fragment.innerHTML);

  assert.pushResult({
    result: actualHTML === html,
    actual: actualHTML,
    expected: html,
    message: "innerHTML doesn't match",
  });
}
