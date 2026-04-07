function normalizeInnerHTML(actualHTML: string) {
  // Strip GXT rendering artifacts
  if ((globalThis as any).__GXT_MODE__) {
    actualHTML = actualHTML
      // Remove GXT placeholder comments (including if-entry)
      .replace(/<!--(?:placeholder|if-entry|each-entry|list-target|list item|list bottom marker|list fragment target marker|curried-start|curried-end)[^>]*-->/g, '')
      // Remove empty comments (GXT doesn't produce these like Glimmer VM)
      .replace(/<!---->/g, '')
      .replace(/\s*data-node-id="[^"]*"/g, '')
      .replace(/<\/?ember-outlet[^>]*>/g, '');
  }

  return actualHTML;
}

export default function equalInnerHTML(
  assert: QUnit['assert'],
  fragment: HTMLElement,
  html: string
) {
  let actualHTML = normalizeInnerHTML(fragment.innerHTML);
  let expectedHTML = html;
  // In GXT mode, strip empty comments from expected too
  if ((globalThis as any).__GXT_MODE__) {
    expectedHTML = expectedHTML.replace(/<!---->/g, '');
  }

  assert.pushResult({
    result: actualHTML === expectedHTML,
    actual: actualHTML,
    expected: expectedHTML,
    message: "innerHTML doesn't match",
  });
}
