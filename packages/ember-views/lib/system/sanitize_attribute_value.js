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

export default function sanitizeAttributeValue(element, attribute, value) {
  var tagName;

  if (!parsingNode) {
    parsingNode = document.createElement('a');
  }

  if (!element) {
    tagName = null;
  } else {
    tagName = element.tagName;
  }

  if (value && value.toHTML) {
    return value.toHTML();
  }

  if ((tagName === null || badTags[tagName]) && badAttributes[attribute]) {
    parsingNode.href = value;

    if (badProtocols[parsingNode.protocol] === true) {
      return 'unsafe:' + value;
    }
  }

  return value;
}
