export function equalInnerHTML(fragment, html) {
  var actualHTML = normalizeInnerHTML(fragment.innerHTML);
  QUnit.push(actualHTML === html, actualHTML, html);
}

export function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  equalInnerHTML(div, html);
}

export function normalizeInnerHTML(actualHTML) {
  // drop newlines in IE
  actualHTML = actualHTML.replace(/\r\n/gm, '');
  // downcase ALLCAPS tags in IE
  actualHTML = actualHTML.replace(/<\/?([A-Z]+)/gi, function(tag){
    return tag.toLowerCase();
  });
  return actualHTML;
}
