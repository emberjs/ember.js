/**
@module ember
@submodule ember-views
*/

/* BEGIN METAMORPH HELPERS */

// Internet Explorer prior to 9 does not allow setting innerHTML if the first element
// is a "zero-scope" element. This problem can be worked around by making
// the first node an invisible text node. We, like Modernizr, use &shy;

var needsShy = this.document && (function() {
  var testEl = document.createElement('div');
  testEl.innerHTML = "<div></div>";
  testEl.firstChild.innerHTML = "<script></script>";
  return testEl.firstChild.innerHTML === '';
})();

// IE 8 (and likely earlier) likes to move whitespace preceeding
// a script tag to appear after it. This means that we can
// accidentally remove whitespace when updating a morph.
var movesWhitespace = this.document && (function() {
  var testEl = document.createElement('div');
  testEl.innerHTML = "Test: <script type='text/x-placeholder'></script>Value";
  return testEl.childNodes[0].nodeValue === 'Test:' &&
          testEl.childNodes[2].nodeValue === ' Value';
})();

// Use this to find children by ID instead of using jQuery
var findChildById = function(element, id) {
  if (element.getAttribute('id') === id) { return element; }

  var len = element.childNodes.length, idx, node, found;
  for (idx=0; idx<len; idx++) {
    node = element.childNodes[idx];
    found = node.nodeType === 1 && findChildById(node, id);
    if (found) { return found; }
  }
};

var setInnerHTMLWithoutFix = function(element, html) {
  if (needsShy) {
    html = '&shy;' + html;
  }

  var matches = [];
  if (movesWhitespace) {
    // Right now we only check for script tags with ids with the
    // goal of targeting morphs.
    html = html.replace(/(\s+)(<script id='([^']+)')/g, function(match, spaces, tag, id) {
      matches.push([id, spaces]);
      return tag;
    });
  }

  element.innerHTML = html;

  // If we have to do any whitespace adjustments do them now
  if (matches.length > 0) {
    var len = matches.length, idx;
    for (idx=0; idx<len; idx++) {
      var script = findChildById(element, matches[idx][0]),
          node = document.createTextNode(matches[idx][1]);
      script.parentNode.insertBefore(node, script);
    }
  }

  if (needsShy) {
    var shyElement = element.firstChild;
    while (shyElement.nodeType === 1 && !shyElement.nodeName) {
      shyElement = shyElement.firstChild;
    }
    if (shyElement.nodeType === 3 && shyElement.nodeValue.charAt(0) === "\u00AD") {
      shyElement.nodeValue = shyElement.nodeValue.slice(1);
    }
  }
};

/* END METAMORPH HELPERS */


var innerHTMLTags = {};
var canSetInnerHTML = function(tagName) {
  if (innerHTMLTags[tagName] !== undefined) {
    return innerHTMLTags[tagName];
  }

  var canSet = true;

  // IE 8 and earlier don't allow us to do innerHTML on select
  if (tagName.toLowerCase() === 'select') {
    var el = document.createElement('select');
    setInnerHTMLWithoutFix(el, '<option value="test">Test</option>');
    canSet = el.options.length === 1;
  }

  innerHTMLTags[tagName] = canSet;

  return canSet;
};

var setInnerHTML = function(element, html) {
  var tagName = element.tagName;

  if (canSetInnerHTML(tagName)) {
    setInnerHTMLWithoutFix(element, html);
  } else {
    // Firefox versions < 11 do not have support for element.outerHTML.
    var outerHTML = element.outerHTML || new XMLSerializer().serializeToString(element);
    Ember.assert("Can't set innerHTML on "+element.tagName+" in this browser", outerHTML);

    var startTag = outerHTML.match(new RegExp("<"+tagName+"([^>]*)>", 'i'))[0],
        endTag = '</'+tagName+'>';

    var wrapper = document.createElement('div');
    setInnerHTMLWithoutFix(wrapper, startTag + html + endTag);
    element = wrapper.firstChild;
    while (element.tagName !== tagName) {
      element = element.nextSibling;
    }
  }

  return element;
};

function isSimpleClick(event) {
  var modifier = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey,
      secondaryClick = event.which > 1; // IE9 may return undefined

  return !modifier && !secondaryClick;
}

Ember.ViewUtils = {
  setInnerHTML: setInnerHTML,
  isSimpleClick: isSimpleClick
};
