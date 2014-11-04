export var svgHTMLIntegrationPoints = {foreignObject: 1, desc: 1, title: 1};
export var svgNamespace = 'http://www.w3.org/2000/svg';

// Safari does not like using innerHTML on SVG HTML integration
// points (desc/title/foreignObject).
var needsIntegrationPointFix = document && document.createElementNS && (function() {
  // In FF title will not accept innerHTML.
  var testEl = document.createElementNS(svgNamespace, 'title');
  testEl.innerHTML = "<div></div>";
  return testEl.childNodes.length === 0 || testEl.childNodes[0].nodeType !== 1;
})();

// Internet Explorer prior to 9 does not allow setting innerHTML if the first element
// is a "zero-scope" element. This problem can be worked around by making
// the first node an invisible text node. We, like Modernizr, use &shy;
var needsShy = document && (function() {
  var testEl = document.createElement('div');
  testEl.innerHTML = "<div></div>";
  testEl.firstChild.innerHTML = "<script><\/script>";
  return testEl.firstChild.innerHTML === '';
})();

// IE 8 (and likely earlier) likes to move whitespace preceeding
// a script tag to appear after it. This means that we can
// accidentally remove whitespace when updating a morph.
var movesWhitespace = document && (function() {
  var testEl = document.createElement('div');
  testEl.innerHTML = "Test: <script type='text/x-placeholder'><\/script>Value";
  return testEl.childNodes[0].nodeValue === 'Test:' &&
          testEl.childNodes[2].nodeValue === ' Value';
})();

// IE8 create a selected attribute where they should only
// create a property
var createsSelectedAttribute = document && (function() {
  var testEl = document.createElement('div');
  testEl.innerHTML = "<select><option></option></select>";
  return testEl.childNodes[0].childNodes[0].getAttribute('selected') === 'selected';
})();

var detectAutoSelectedOption;
if (createsSelectedAttribute) {
  var detectAutoSelectedOptionRegex = /<option[^>]*selected/;
  detectAutoSelectedOption = function detectAutoSelectedOption(select, option, html) { //jshint ignore:line
    return select.selectedIndex === 0 &&
           !detectAutoSelectedOptionRegex.test(html);
  };
} else {
  detectAutoSelectedOption = function detectAutoSelectedOption(select, option, html) { //jshint ignore:line
    var selectedAttribute = option.getAttribute('selected');
    return select.selectedIndex === 0 && (
             selectedAttribute === null ||
             ( selectedAttribute !== '' && selectedAttribute.toLowerCase() !== 'selected' )
            );
  };
}

// IE 9 and earlier don't allow us to set innerHTML on col, colgroup, frameset,
// html, style, table, tbody, tfoot, thead, title, tr. Detect this and add
// them to an initial list of corrected tags.
//
// Here we are only dealing with the ones which can have child nodes.
//
var tagNamesRequiringInnerHTMLFix, tableNeedsInnerHTMLFix;
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
if (selectInnerHTMLTestElement) {
  tagNamesRequiringInnerHTMLFix = tagNamesRequiringInnerHTMLFix || {};
  tagNamesRequiringInnerHTMLFix.select = [];
}

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
    contextualElement = dom.cloneNode(contextualElement, false);
    scriptSafeInnerHTML(contextualElement, html);
    return contextualElement.childNodes;
  };
} else {
  buildDOM = function buildDOM(html, contextualElement, dom){
    contextualElement = dom.cloneNode(contextualElement, false);
    contextualElement.innerHTML = html;
    return contextualElement.childNodes;
  };
}

var buildIESafeDOM;
if (tagNamesRequiringInnerHTMLFix || movesWhitespace) {
  buildIESafeDOM = function buildIESafeDOM(html, contextualElement, dom) {
    // Make a list of the leading text on script nodes. Include
    // script tags without any whitespace for easier processing later.
    var spacesBefore = [];
    var spacesAfter = [];
    html = html.replace(/(\s*)(<script)/g, function(match, spaces, tag) {
      spacesBefore.push(spaces);
      return tag;
    });

    html = html.replace(/(<\/script>)(\s*)/g, function(match, tag, spaces) {
      spacesAfter.push(spaces);
      return tag;
    });

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
    for (i=0;node=nodes[i];i++) {
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
    for (i=0;scriptNode=scriptNodes[i];i++) {
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

// When parsing innerHTML, the browser may set up DOM with some things
// not desired. For example, with a select element context and option
// innerHTML the first option will be marked selected.
//
// This method cleans up some of that, resetting those values back to
// their defaults.
//
function buildSafeDOM(html, contextualElement, dom) {
  var childNodes = buildIESafeDOM(html, contextualElement, dom);

  if (contextualElement.tagName === 'SELECT') {
    // Walk child nodes
    for (var i = 0; childNodes[i]; i++) {
      // Find and process the first option child node
      if (childNodes[i].tagName === 'OPTION') {
        if (detectAutoSelectedOption(childNodes[i].parentNode, childNodes[i], html)) {
          // If the first node is selected but does not have an attribute,
          // presume it is not really selected.
          childNodes[i].parentNode.selectedIndex = -1;
        }
        break;
      }
    }
  }

  return childNodes;
}

var buildHTMLDOM;
if (needsIntegrationPointFix) {
  buildHTMLDOM = function buildHTMLDOM(html, contextualElement, dom){
    if (svgHTMLIntegrationPoints[contextualElement.tagName]) {
      return buildSafeDOM(html, document.createElement('div'), dom);
    } else {
      return buildSafeDOM(html, contextualElement, dom);
    }
  };
} else {
  buildHTMLDOM = buildSafeDOM;
}

export {buildHTMLDOM};
