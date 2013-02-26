/**
@module ember
@submodule ember-views
*/

/*** BEGIN METAMORPH HELPERS ***/

// Internet Explorer prior to 9 does not allow setting innerHTML if the first element
// is a "zero-scope" element. This problem can be worked around by making
// the first node an invisible text node. We, like Modernizr, use &shy;
var needsShy = (function(){
  var testEl = document.createElement('div');
  testEl.innerHTML = "<div></div>";
  testEl.firstChild.innerHTML = "<script></script>";
  return testEl.firstChild.innerHTML === '';
})();

// IE 8 (and likely earlier) likes to move whitespace preceeding
// a script tag to appear after it. This means that we can
// accidentally remove whitespace when updating a morph.
var movesWhitespace = (function() {
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

/**
 * This code is mostly taken from jQuery, with one exception. In jQuery's case, we
 * have some HTML and we need to figure out how to convert it into some nodes.
 *
 * In this case, jQuery needs to scan the HTML looking for an opening tag and use
 * that as the key for the wrap map. In our case, we know the parent node, and
 * can use its type as the key for the wrap map.
 **/
var wrapMap = {
  select: [ 1, "<select multiple='multiple'>", "</select>", "<option>testing</option>" ],
  fieldset: [ 1, "<fieldset>", "</fieldset>", "<legend>testing</legend>" ],
  table: [ 1, "<table>", "</table>", "<tbody><tr><td>testing</td></tr></tbody>" ],
  tbody: [ 2, "<table><tbody>", "</tbody></table>", "<tr><td>testing</td></tr>" ],
  tr: [ 3, "<table><tbody><tr>", "</tr></tbody></table>", "<td>testing</td>" ],
  colgroup: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>", "<col>" ],
  map: [ 1, "<map>", "</map>", "<area>" ]
};

/**
 * Given a parent node and some HTML, generate a set of nodes. Return the first
 * node, which will allow us to traverse the rest using nextSibling.
 *
 * We need to do this because innerHTML in IE does not really parse the nodes.
 **/
var firstNodeFor = function(parentNode, html) {
  var arr = wrapMap[parentNode.tagName.toLowerCase()] || wrapMap._default;
  var depth = arr[0], start = arr[1], end = arr[2];
  var element = document.createElement('div');
  setInnerHTMLWithoutFix(element, start + html + end);
  element = element.getElementsByTagName(parentNode.tagName)[0].firstChild;
  return element;
};

/*** END METAMORPH HELPERS */


var innerHTMLTags = {};
var canSetInnerHTML = function(tagName) {
  if (innerHTMLTags[tagName] !== undefined) {
    return innerHTMLTags[tagName];
  }

  var tagNameLowerCase = tagName.toLowerCase();
  var canSet = true;

  if (wrapMap[tagNameLowerCase] !== undefined) {
    var arr = wrapMap[tagNameLowerCase];
    var testHTML = arr[3];
    
    var testEl = document.createElement(tagName);
    try {
      setInnerHTMLWithoutFix(testEl, testHTML);  
    } catch (e) {
      canSet = false;
    }

    canSet = canSet ? testEl.innerHTML === testHTML: false;
  }
  
  innerHTMLTags[tagName] = canSet;

  return canSet;
};

var setInnerHTML = function(element, html) {
  var tagName = element.tagName;
  var node, nextSibling;
  
  if (canSetInnerHTML(tagName)) {
    setInnerHTMLWithoutFix(element, html);
  } else {
    // get the first node for the HTML string, even in cases like
    // tables and lists where a simple innerHTML on a div would
    // swallow some of the content.
    node = firstNodeFor(element, html);

    while (node) {
      nextSibling = node.nextSibling;
      element.appendChild(node);
      node = nextSibling;
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
