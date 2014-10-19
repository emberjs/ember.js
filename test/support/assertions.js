export function equalInnerHTML(fragment, html) {
  var actualHTML = normalizeInnerHTML(fragment.innerHTML);
  QUnit.push(actualHTML === html, actualHTML, html);
}

export function equalHTML(node, html) {
  var fragment;
  if (!node.nodeType && node.length) {
    fragment = document.createDocumentFragment();
    while (node[0]) {
      fragment.appendChild(node[0]);
    }
  } else {
    fragment = node;
  }

  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  equalInnerHTML(div, html);
}

// detect weird IE8 html strings
var ie8InnerHTMLTestElement = document.createElement('div');
ie8InnerHTMLTestElement.setAttribute('id', 'womp');
var ie8InnerHTML = (ie8InnerHTMLTestElement.outerHTML.indexOf('id=womp') > -1);
export function normalizeInnerHTML(actualHTML) {
  if (ie8InnerHTML) {
    // drop newlines in IE8
    actualHTML = actualHTML.replace(/\r\n/gm, '');
    // downcase ALLCAPS tags in IE8
    actualHTML = actualHTML.replace(/<\/?[A-Z]+/gi, function(tag){
      return tag.toLowerCase();
    });
    // quote ids in IE8
    actualHTML = actualHTML.replace(/id=([^ >]+)/gi, function(match, id){
      return 'id="'+id+'"';
    });
  }
  return actualHTML;
}

// detect weird IE8 checked element string
var checkedInput = document.createElement('input');
checkedInput.setAttribute('checked', 'checked');
var checkedInputString = checkedInput.outerHTML;
export function isCheckedInputHTML(element) {
  equal(element.outerHTML, checkedInputString);
}
