/* jshint scripturl:true */

import EmberHandlebars from "ember-handlebars-compiler";

var parsingNode = document.createElement('a');
var badProtocols = {
  'javascript:': true,
  'vbscript:': true
};

export default function sanitizeAttributeValue(element, attribute, value) {
  var tagName;

  if (!element) {
    tagName = null;
  } else {
    tagName = element.tagName;
  }

  if (value instanceof EmberHandlebars.SafeString) {
    return value.toString();
  }


  if ((tagName === null || tagName === 'A') && attribute === 'href') {
    parsingNode.href = value;

    if (badProtocols[parsingNode.protocol] === true) {
      return 'unsafe:' + value;
    }
  }

  return value;
}
