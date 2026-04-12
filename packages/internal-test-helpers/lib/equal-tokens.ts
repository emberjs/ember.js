// Compare two HTML fragments for semantic equivalence, ignoring attribute order.
// Uses the browser's DOM parser to normalize both sides.

function normalizeHTML(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;
  sortAttributes(container);
  return container.innerHTML;
}

function sortAttributes(element: Element): void {
  for (const child of Array.from(element.children)) {
    if (child.attributes.length > 1) {
      const attrs = Array.from(child.attributes).map((a) => [a.name, a.value] as const);
      attrs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      for (const [name] of attrs) {
        child.removeAttribute(name);
      }
      for (const [name, value] of attrs) {
        child.setAttribute(name, value);
      }
    }
    sortAttributes(child);
  }
}

export default function equalTokens(
  actualContainer: string | Element,
  expectedHTML: string,
  message: string | null = null
) {
  const actualHTML =
    typeof actualContainer === 'string' ? actualContainer : actualContainer.innerHTML;
  const normalizedActual = normalizeHTML(actualHTML);
  const normalizedExpected = normalizeHTML(expectedHTML);

  const { assert } = QUnit.config.current;
  assert.pushResult({
    result: normalizedActual === normalizedExpected,
    actual: actualHTML,
    expected: expectedHTML,
    message,
  });
}
