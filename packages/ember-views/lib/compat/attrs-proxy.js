import {
  Mixin,
  symbol,
  PROPERTY_DID_CHANGE
} from 'ember-metal';

export function deprecation(key) {
  return `You tried to look up an attribute directly on the component. This is deprecated. Use attrs.${key} instead.`;
}

export let MUTABLE_CELL = symbol('MUTABLE_CELL');

function isCell(val) {
  return val && val[MUTABLE_CELL];
}

export function getAttrFor(attrs, key) {
  let val = attrs[key];
  return isCell(val) ? val.value : val;
}

const AttrsProxyMixin = {
  attrs: null,

  getAttr(key) {
    let attrs = this.attrs;
    if (!attrs) { return; }
    return getAttrFor(attrs, key);
  },

  setAttr(key, value) {
    let attrs = this.attrs;
    let val = attrs[key];

    if (!isCell(val)) {
      throw new Error(`You can't update attrs.${key}, because it's not mutable`);
    }

    val.update(value);
  },

  _propagateAttrsToThis(attrs) {
    this._isDispatchingAttrs = true;
    this.setProperties(attrs);
    this._isDispatchingAttrs = false;
  }
};

AttrsProxyMixin[PROPERTY_DID_CHANGE] = function(key) {
  if (this._isDispatchingAttrs) { return; }

  if (this._currentState) {
    this._currentState.legacyPropertyDidChange(this, key);
  }
};

export default Mixin.create(AttrsProxyMixin);
