import { warn, debugSeal } from 'ember-metal/debug';
import DOMHelper from 'dom-helper';
import isNone from 'ember-metal/is_none';
import { STYLE_WARNING } from 'ember-views/system/utils';

const HTMLBarsAttrMorph = DOMHelper.prototype.AttrMorphClass;

let proto = HTMLBarsAttrMorph.prototype;

proto.didInit = function() {
  this.streamUnsubscribers = null;

  debugSeal(this);
};

function deprecateEscapedStyle(morph, value) {
  warn(
    STYLE_WARNING,
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

proto.willSetContent = function (value) {
  deprecateEscapedStyle(this, value);
};

export default HTMLBarsAttrMorph;
