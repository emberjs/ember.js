/* global XMLSerializer:false */
export var svgHTMLIntegrationPoints = {foreignObject: 1, desc: 1, title: 1};
export var svgNamespace = 'http://www.w3.org/2000/svg';

var doc = typeof document === 'undefined' ? false : document;

// Safari does not like using innerHTML on SVG HTML integration
// points (desc/title/foreignObject).
var needsIntegrationPointFix = doc && (function(document) {
  if (document.createElementNS === undefined) {
    return;
  }
  // In FF title will not accept innerHTML.
  var testEl = document.createElementNS(svgNamespace, 'title');
  testEl.innerHTML = "<div></div>";
  return testEl.childNodes.length === 0 || testEl.childNodes[0].nodeType !== 1;
})(doc);

// Internet Explorer prior to 9 does not allow setting innerHTML if the first element
// is a "zero-scope" element. This problem can be worked around by making
// the first node an invisible text node. We, like Modernizr, use &shy;
var needsShy = doc && (function(document) {
  var testEl = document.createElement('div');
  testEl.innerHTML = "<div></div>";
  testEl.firstChild.innerHTML = "<script><\/script>";
  return testEl.firstChild.innerHTML === '';
})(doc);

// IE 8 (and likely earlier) likes to move whitespace preceeding
// a script tag to appear after it. This means that we can
// accidentally remove whitespace when updating a morph.
var movesWhitespace = doc && (function(document) {
  var testEl = document.createElement('div');
  testEl.innerHTML = "Test: <script type='text/x-placeholder'><\/script>Value";
  return testEl.childNodes[0].nodeValue === 'Test:' &&
          testEl.childNodes[2].nodeValue === ' Value';
})(doc);

var tagNamesRequiringInnerHTMLFix = doc && (function(document) {
  var tagNamesRequiringInnerHTMLFix;
  // IE 9 and earlier don't allow us to set innerHTML on col, colgroup, frameset,
  // html, style, table, tbody, tfoot, thead, title, tr. Detect this and add
  // them to an initial list of corrected tags.
  //
  // Here we are only dealing with the ones which can have child nodes.
  //
  var tableNeedsInnerHTMLFix;
  var tableInnerHTMLTestElement = document.createElement('table');
  try {
    tableInnerHTMLTestElement.innerHTML = '<tbody></tbody>';
  } catch (e) {
  } finally {
    tableNeedsInnerHTMLFix = (tableInnerHTMLTestElement.childNodes.length === 0);
  }
  if (tableNeedsInnerHTMLFix) {
    tagNamesRequiringInnerHTMLFix = {
      colgroup: ['table'],
      table: [],
      tbody: ['table'],
      tfoot: ['table'],
      thead: ['table'],
      tr: ['table', 'tbody']
    };
  }

  // IE 8 doesn't allow setting innerHTML on a select tag. Detect this and
  // add it to the list of corrected tags.
  //
  var selectInnerHTMLTestElement = document.createElement('select');
  selectInnerHTMLTestElement.innerHTML = '<option></option>';
  if (!selectInnerHTMLTestElement.childNodes[0]) {
    tagNamesRequiringInnerHTMLFix = tagNamesRequiringInnerHTMLFix || {};
    tagNamesRequiringInnerHTMLFix.select = [];
  }
  return tagNamesRequiringInnerHTMLFix;
})(doc);

function scriptSafeInnerHTML(element, html) {
  // without a leading text node, IE will drop a leading script tag.
  html = '&shy;'+html;

  element.innerHTML = html;

  var nodes = element.childNodes;

  // Look for &shy; to remove it.
  var shyElement = nodes[0];
  while (shyElement.nodeType === 1 && !shyElement.nodeName) {
    shyElement = shyElement.firstChild;
  }
  // At this point it's the actual unicode character.
  if (shyElement.nodeType === 3 && shyElement.nodeValue.charAt(0) === "\u00AD") {
    var newValue = shyElement.nodeValue.slice(1);
    if (newValue.length) {
      shyElement.nodeValue = shyElement.nodeValue.slice(1);
    } else {
      shyElement.parentNode.removeChild(shyElement);
    }
  }

  return nodes;
}

function buildDOMWithFix(html, contextualElement){
  var tagName = contextualElement.tagName;

  // Firefox versions < 11 do not have support for element.outerHTML.
  var outerHTML = contextualElement.outerHTML || new XMLSerializer().serializeToString(contextualElement);
  if (!outerHTML) {
    throw "Can't set innerHTML on "+tagName+" in this browser";
  }

  html = fixSelect(html, contextualElement);

  var wrappingTags = tagNamesRequiringInnerHTMLFix[tagName.toLowerCase()];

  var startTag = outerHTML.match(new RegExp("<"+tagName+"([^>]*)>", 'i'))[0];
  var endTag = '</'+tagName+'>';

  var wrappedHTML = [startTag, html, endTag];

  var i = wrappingTags.length;
  var wrappedDepth = 1 + i;
  while(i--) {
    wrappedHTML.unshift('<'+wrappingTags[i]+'>');
    wrappedHTML.push('</'+wrappingTags[i]+'>');
  }

  var wrapper = document.createElement('div');
  scriptSafeInnerHTML(wrapper, wrappedHTML.join(''));
  var element = wrapper;
  while (wrappedDepth--) {
    element = element.firstChild;
    while (element && element.nodeType !== 1) {
      element = element.nextSibling;
    }
  }
  while (element && element.tagName !== tagName) {
    element = element.nextSibling;
  }
  return element ? element.childNodes : [];
}

var buildDOM;
if (needsShy) {
  buildDOM = function buildDOM(html, contextualElement, dom){
    html = fixSelect(html, contextualElement);

    contextualElement = dom.cloneNode(contextualElement, false);
    scriptSafeInnerHTML(contextualElement, html);
    return contextualElement.childNodes;
  };
} else {
  buildDOM = function buildDOM(html, contextualElement, dom){
    html = fixSelect(html, contextualElement);

    contextualElement = dom.cloneNode(contextualElement, false);
    contextualElement.innerHTML = html;
    return contextualElement.childNodes;
  };
}

function fixSelect(html, contextualElement) {
  if (contextualElement.tagName === 'SELECT') {
    html = "<option></option>" + html;
  }

  return html;
}

var buildIESafeDOM;
if (tagNamesRequiringInnerHTMLFix || movesWhitespace) {
  buildIESafeDOM = function buildIESafeDOM(html, contextualElement, dom) {
    // Make a list of the leading text on script nodes. Include
    // script tags without any whitespace for easier processing later.
    var spacesBefore = [];
    var spacesAfter = [];
    if (typeof html === 'string') {
      html = html.replace(/(\s*)(<script)/g, function(match, spaces, tag) {
        spacesBefore.push(spaces);
        return tag;
      });

      html = html.replace(/(<\/script>)(\s*)/g, function(match, tag, spaces) {
        spacesAfter.push(spaces);
        return tag;
      });
    }

    // Fetch nodes
    var nodes;
    if (tagNamesRequiringInnerHTMLFix[contextualElement.tagName.toLowerCase()]) {
      // buildDOMWithFix uses string wrappers for problematic innerHTML.
      nodes = buildDOMWithFix(html, contextualElement);
    } else {
      nodes = buildDOM(html, contextualElement, dom);
    }

    // Build a list of script tags, the nodes themselves will be
    // mutated as we add test nodes.
    var i, j, node, nodeScriptNodes;
    var scriptNodes = [];
    for (i=0;i<nodes.length;i++) {
      node=nodes[i];
      if (node.nodeType !== 1) {
        continue;
      }
      if (node.tagName === 'SCRIPT') {
        scriptNodes.push(node);
      } else {
        nodeScriptNodes = node.getElementsByTagName('script');
        for (j=0;j<nodeScriptNodes.length;j++) {
          scriptNodes.push(nodeScriptNodes[j]);
        }
      }
    }

    // Walk the script tags and put back their leading text nodes.
    var scriptNode, textNode, spaceBefore, spaceAfter;
    for (i=0;i<scriptNodes.length;i++) {
      scriptNode = scriptNodes[i];
      spaceBefore = spacesBefore[i];
      if (spaceBefore && spaceBefore.length > 0) {
        textNode = dom.document.createTextNode(spaceBefore);
        scriptNode.parentNode.insertBefore(textNode, scriptNode);
      }

      spaceAfter = spacesAfter[i];
      if (spaceAfter && spaceAfter.length > 0) {
        textNode = dom.document.createTextNode(spaceAfter);
        scriptNode.parentNode.insertBefore(textNode, scriptNode.nextSibling);
      }
    }

    return nodes;
  };
} else {
  buildIESafeDOM = buildDOM;
}

var buildHTMLDOM;
if (needsIntegrationPointFix) {
  buildHTMLDOM = function buildHTMLDOM(html, contextualElement, dom){
    if (svgHTMLIntegrationPoints[contextualElement.tagName]) {
      return buildIESafeDOM(html, document.createElement('div'), dom);
    } else {
      return buildIESafeDOM(html, contextualElement, dom);
    }
  };
} else {
  buildHTMLDOM = buildIESafeDOM;
}

export {buildHTMLDOM};
