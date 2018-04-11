// detect side-effects of cloning svg elements in IE9-11
let ieSVGInnerHTML = (() => {
  if (!document.createElementNS) {
    return false;
  }
  let div = document.createElement('div');
  let node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  div.appendChild(node);
  let clone = div.cloneNode(true);
  return clone.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" />';
})();

function normalizeInnerHTML(actualHTML) {
  if (ieSVGInnerHTML) {
    // Replace `<svg xmlns="http://www.w3.org/2000/svg" height="50%" />` with `<svg height="50%"></svg>`, etc.
    // drop namespace attribute
    // replace self-closing elements
    actualHTML = actualHTML
      .replace(/ xmlns="[^"]+"/, '')
      .replace(
        /<([^ >]+) [^\/>]*\/>/gi,
        (tag, tagName) => `${tag.slice(0, tag.length - 3)}></${tagName}>`
      );
  }

  return actualHTML;
}

export default function equalInnerHTML(assert, fragment, html) {
  let actualHTML = normalizeInnerHTML(fragment.innerHTML);

  assert.pushResult({
    result: actualHTML === html,
    actual: actualHTML,
    expected: html,
  });
}
