import { stripGxtArtifacts } from './equal-tokens';

export default function equalInnerHTML(
  assert: QUnit['assert'],
  fragment: HTMLElement,
  html: string
) {
  let actualHTML = stripGxtArtifacts(fragment.innerHTML);
  let expectedHTML = html;
  // In GXT mode, strip empty comments from expected too
  if (__GXT_MODE__) {
    expectedHTML = expectedHTML.replace(/<!---->/g, '');
  }

  assert.pushResult({
    result: actualHTML === expectedHTML,
    actual: actualHTML,
    expected: expectedHTML,
    message: "innerHTML doesn't match",
  });
}
