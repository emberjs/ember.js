/**
@module ember
@submodule ember-htmlbars
*/

import AttrNode from "./attr_node";
import { fmt } from "ember-runtime/system/string";
import { typeOf } from "ember-metal/utils";
import { read } from "ember-metal/streams/utils";
import o_create from "ember-metal/platform/create";

function LegacyBindAttrNode(attrName, attrValue) {
  this.init(attrName, attrValue);

  this._dynamicStyleDeprecationMessage = '`<div {{bind-attr style=someProperty}}>` to ' +
    '`<div style={{{someProperty}}}>`.';
}

LegacyBindAttrNode.prototype = o_create(AttrNode.prototype);

LegacyBindAttrNode.prototype.render = function render(buffer) {
  this.isDirty = false;
  if (this.isDestroying) {
    return;
  }
  var value = read(this.attrValue);

  if (value === undefined) {
    value = null;
  }

  if ((this.attrName === 'value' || this.attrName === 'src') && value === null) {
    value = '';
  }

  Ember.assert(fmt("Attributes must be numbers, strings or booleans, not %@", [value]),
               value === null || value === undefined || typeOf(value) === 'number' || typeOf(value) === 'string' || typeOf(value) === 'boolean');

  if (this.lastValue !== null || value !== null) {
    this._deprecateEscapedStyle(value);
    this._morph.setContent(value);
    this.lastValue = value;
  }
};

export default LegacyBindAttrNode;

