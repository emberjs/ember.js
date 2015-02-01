/* jshint scripturl:true */

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

export function sanitizeAttributeValue(dom, element, attribute, value) {
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
    var protocol = dom.protocolForURL(value);
    if (badProtocols[protocol] === true) {
      return 'unsafe:' + value;
    }
  }

  return value;
}
