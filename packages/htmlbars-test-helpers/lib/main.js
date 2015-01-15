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

// detect side-effects of cloning svg elements in IE9-11
var ieSVGInnerHTML = (function () {
  if (!document.createElementNS) {
    return false;
  }
  var div = document.createElement('div');
  var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  div.appendChild(node);
  var clone = div.cloneNode(true);
  return clone.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" />';
})();

export function normalizeInnerHTML(actualHTML) {
  if (ie8InnerHTML) {
    // drop newlines in IE8
    actualHTML = actualHTML.replace(/\r\n/gm, '');
    // downcase ALLCAPS tags in IE8
    actualHTML = actualHTML.replace(/<\/?[A-Z\-]+/gi, function(tag){
      return tag.toLowerCase();
    });
    // quote ids in IE8
    actualHTML = actualHTML.replace(/id=([^ >]+)/gi, function(match, id){
      return 'id="'+id+'"';
    });
    // IE8 adds ':' to some tags
    // <keygen> becomes <:keygen>
    actualHTML = actualHTML.replace(/<(\/?):([^ >]+)/gi, function(match, slash, tag){
      return '<'+slash+tag;
    });

    // Normalize the style attribute
    actualHTML = actualHTML.replace(/style="(.+?)"/gi, function(match, val){
      return 'style="'+val.toLowerCase()+';"';
    });

  }
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

// detect weird IE8 checked element string
var checkedInput = document.createElement('input');
checkedInput.setAttribute('checked', 'checked');
var checkedInputString = checkedInput.outerHTML;
export function isCheckedInputHTML(element) {
  equal(element.outerHTML, checkedInputString);
}

// check which property has the node's text content
var textProperty = document.createElement('div').textContent === undefined ? 'innerText' : 'textContent';
export function getTextContent(el) {
  // textNode
  if (el.nodeType === 3) {
    return el.nodeValue;
  } else {
    return el[textProperty];
  }
}

// IE8 does not have Object.create, so use a polyfill if needed.
// Polyfill based on Mozilla's (MDN)
export function createObject(obj) {
  if (typeof Object.create === 'function') {
    return Object.create(obj);
  } else {
    var Temp = function() {};
    Temp.prototype = obj;
    return new Temp();
  }
}