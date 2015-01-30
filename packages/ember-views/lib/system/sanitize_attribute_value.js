/* jshint scripturl:true */

var parsingNode;
var badProtocols = {
  'javascript:': true,
  'vbscript:': true
};

var badTags = {
  'A': true,
  'BODY': true,
  'LINK': true,
  'IMG': true,
  'IFRAME': true
};

export var badAttributes = {
  'href': true,
  'src': true,
  'background': true
};

export default function sanitizeAttributeValue(dom, element, attribute, value) {
  var tagName;

  if (!element) {
    tagName = null;
  } else {
    tagName = element.tagName;
  }

  if (value && value.toHTML) {
    return value.toHTML();
  }

  if ((tagName === null || badTags[tagName]) && badAttributes[attribute]) {
    // Previously, we relied on creating a new `<a>` element and setting
    // its `href` in order to get the DOM to parse and extract its protocol.
    // Naive approaches to URL parsing are susceptible to all sorts of XSS
    // attacks.
    //
    // However, this approach does not work in environments without a DOM,
    // such as Node & FastBoot. We have extracted the logic for parsing to
    // the DOM helper, so that in locations without DOM, we can substitute
    // our own robust URL parsing.
    //
    // This will also allow us to use the new `URL` API in browsers that
    // support it, and skip the process of creating an element entirely.
    var protocol = dom.protocolForURL(value);
    if (badProtocols[protocol] === true) {
      return 'unsafe:' + value;
    }
  }

  return value;
}
