/* jshint scripturl:true */

var parsingNode;
var badProtocols = {
  'javascript:': true,
  'vbscript:': true
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

  if ((tagName === null || tagName === 'A') && attribute === 'href') {
    parsingNode.href = value;

    if (badProtocols[parsingNode.protocol] === true) {
      return 'unsafe:' + value;
    }
  }

  return value;
}
