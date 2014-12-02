/**
@module ember
@submodule ember-htmlbars
*/

import { fmt } from "ember-runtime/system/string";
import { typeOf } from "ember-metal/utils";
import isNone from 'ember-metal/is_none';
import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";

function LegacyBindAttrNode(element, attrName, attrValue, dom) {
  this.init(element, attrName, attrValue, dom);
}

LegacyBindAttrNode.prototype = o_create(SimpleAttrNode.prototype);

LegacyBindAttrNode.prototype.super$init = SimpleAttrNode.prototype.init;

LegacyBindAttrNode.prototype.render = function render() {
  var name = this.attrName;
  var value = this.currentValue;
  var type = typeOf(value);

  Ember.assert(fmt("Attributes must be numbers, strings or booleans, not %@", [value]),
               value === null || value === undefined || type === 'number' || type === 'string' || type === 'boolean');

  // if this changes, also change the logic in ember-handlebars/lib/helpers/binding.js
  if (name !== 'value' && (type === 'string' || (type === 'number' && !isNaN(value)))) {
    this.dom.setAttribute(this.element, name, value);
  } else if (name === 'value' || type === 'boolean') {
    if (isNone(value) || value === false) {
      // `null`, `undefined` or `false` should remove attribute
      this.dom.removeAttribute(this.element, name);
      // In IE8 `prop` couldn't remove attribute when name is `required`.
      if (name === 'required') {
        this.dom.setProperty(this.element, name, null);
      } else {
        this.dom.setProperty(this.element, name, '');
      }
    } else {
      // value should always be properties
      this.dom.setProperty(this.element, name, value);
    }
  } else if (!value) {
    if (this.lastValue !== null) {
      this.dom.removeAttribute(this.element, name);
    }
  }
};

export default LegacyBindAttrNode;

