import Ember from "ember-metal/core";
import DOMHelper from "dom-helper";
import o_create from 'ember-metal/platform/create';

var HTMLBarsAttrMorph = DOMHelper.prototype.AttrMorphClass;

export var styleWarning = '' +
  'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
  'please ensure that values being bound are properly escaped. For more information, ' +
  'including how to disable this warning, see ' +
  'http://emberjs.com/deprecations/v1.x/#toc_binding-style-attributes.';

function EmberAttrMorph(element, attrName, domHelper, namespace) {
  HTMLBarsAttrMorph.call(this, element, attrName, domHelper, namespace);
  this.streamUnsubscribers = null;
  this.isAttrMorph = true;
}

var proto = EmberAttrMorph.prototype = o_create(HTMLBarsAttrMorph.prototype);
proto.HTMLBarsAttrMorph$setContent = HTMLBarsAttrMorph.prototype.setContent;

proto._deprecateEscapedStyle = function EmberAttrMorph_deprecateEscapedStyle(value) {
  Ember.warn(
    styleWarning,
    (function(name, value, escaped) {
      // SafeString
      if (value && value.toHTML) {
        return true;
      }

      if (name !== 'style') {
        return true;
      }

      return !escaped;
    }(this.attrName, value, this.escaped))
  );
};

proto.setContent = function EmberAttrMorph_setContent(value) {
  this._deprecateEscapedStyle(value);
  this.HTMLBarsAttrMorph$setContent(value);
};

export default EmberAttrMorph;
