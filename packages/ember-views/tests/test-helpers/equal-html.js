export function equalHTML(element, expectedHTML, message) {
  let html;
  if (typeof element === 'string') {
    html = document.getElementById(element).innerHTML;
  } else {
    if (element instanceof window.NodeList) {
      let fragment = document.createElement('div');
      while (element[0]) {
        fragment.appendChild(element[0]);
      }
      html = fragment.innerHTML;
    } else {
      html = element.outerHTML;
    }
  }

  let actualHTML = html.replace(/ id="[^"]+"/gmi, '');
  actualHTML = actualHTML.replace(/<\/?([A-Z]+)/gi, tag => tag.toLowerCase());
  actualHTML = actualHTML.replace(/\r\n/gm, '');
  actualHTML = actualHTML.replace(/ $/, '');
  equal(actualHTML, expectedHTML, message || 'HTML matches');
}
