// detect side-effects of cloning svg elements in IE9-11
let ieSVGInnerHTML = (function() {
  if (typeof document === 'undefined' || !document.createElementNS) {
    return false;
  }
  let div = document.createElement('div');
  let node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  div.appendChild(node);
  let clone = div.cloneNode(true) as HTMLDivElement;
  return clone.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" />';
})();

export function normalizeInnerHTML(actualHTML: string) {
  if (ieSVGInnerHTML) {
    // Replace `<svg xmlns="http://www.w3.org/2000/svg" height="50%" />` with `<svg height="50%"></svg>`, etc.
    // drop namespace attribute
    actualHTML = actualHTML.replace(/ xmlns="[^"]+"/, '');
    // replace self-closing elements
    actualHTML = actualHTML.replace(/<([^ >]+) [^\/>]*\/>/gi, function(tag, tagName) {
      return tag.slice(0, tag.length - 3) + '></' + tagName + '>';
    });
  }

  return actualHTML;
}
