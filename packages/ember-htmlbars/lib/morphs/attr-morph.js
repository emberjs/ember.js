import { warn, debugSeal } from 'ember-metal/debug';
import DOMHelper from 'dom-helper';
import isNone from 'ember-metal/is_none';

const HTMLBarsAttrMorph = DOMHelper.prototype.AttrMorphClass;

let proto = HTMLBarsAttrMorph.prototype;

proto.didInit = function() {
  this.streamUnsubscribers = null;

  debugSeal(this);
};

function deprecateEscapedStyle(morph, value) {
  warn(
    createStyleWarning(value),
    (function(name, value, escaped) {
      // SafeString
      if (isNone(value) || (value && value.toHTML)) {
        return true;
      }

      if (name !== 'style') {
        return true;
      }

      return !escaped;
    }(morph.attrName, value, morph.escaped)),
    { id: 'ember-htmlbars.style-xss-warning' }
  );
}

export function createStyleWarning(value) {
  return 'Binding style attributes may introduce cross-site scripting vulnerabilities;' +
  'please ensure that values being bound are properly escaped. For more information,' +
  'including how to disable this warning, see' +
  'http://emberjs.com/deprecations/v1.x/#toc_binding-style-attributes. Affected style: "' + value + '"';
}

proto.willSetContent = function (value) {
  deprecateEscapedStyle(this, value);
};

export default HTMLBarsAttrMorph;
