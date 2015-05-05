export function equalHTML(element, expectedHTML, message) {
  var html;
  if (typeof element === 'string') {
    html = document.getElementById(element).innerHTML;
  } else {
    if (element instanceof window.NodeList) {
      var fragment = document.createElement('div');
      while (element[0]) {
        fragment.appendChild(element[0]);
      }
      html = fragment.innerHTML;
    } else {
      html = element.outerHTML;
    }
  }

  var actualHTML = html.replace(/ id="[^"]+"/gmi, '');
  actualHTML = actualHTML.replace(/<\/?([A-Z]+)/gi, function(tag) {
    return tag.toLowerCase();
  });
  actualHTML = actualHTML.replace(/\r\n/gm, '');
  actualHTML = actualHTML.replace(/ $/, '');
  equal(actualHTML, expectedHTML, message || "HTML matches");
}
