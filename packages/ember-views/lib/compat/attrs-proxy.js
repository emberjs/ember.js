import { get } from "ember-metal/property_get";
//import { set } from "ember-metal/property_set";
import { Mixin } from "ember-metal/mixin";
import { on } from "ember-metal/events";
import { symbol } from "ember-metal/utils";
import objectKeys from "ember-metal/keys";
import { INTERCEPT_SET, UNHANDLED_SET } from 'ember-metal/property_set';
//import run from "ember-metal/run_loop";

export function deprecation(key) {
  return `You tried to look up an attribute directly on the component. This is deprecated. Use attrs.${key} instead.`;
}

export let MUTABLE_CELL = symbol("MUTABLE_CELL");

function isCell(val) {
  return val && val[MUTABLE_CELL];
}

let AttrsProxyMixin = {
  attrs: null,

  getAttr(key) {
    let attrs = this.attrs;
    if (!attrs) { return; }
    return this.getAttrFor(attrs, key);
  },

  getAttrFor(attrs, key) {
    let val = attrs[key];
    return isCell(val) ? val.value() : val;
  },

  setAttr(key, value) {
    let attrs = this.attrs;
    let val = attrs[key];

    if (!isCell(val)) {
      throw new Error(`You can't update attrs.${key}, because it's not mutable`);
    }

    val.update(value);
  },

  legacyDidReceiveAttrs: on('didReceiveAttrs', function() {
    var keys = objectKeys(this.attrs);

    for (var i=0, l=keys.length; i<l; i++) {
      // Only issue the deprecation if it wasn't already issued when
      // setting attributes initially.
      if (!(keys[i] in this)) {
        this.notifyPropertyChange(keys[i]);
      }
    }
  }),

  unknownProperty(key) {
    var attrs = get(this, 'attrs');

    if (attrs && key in attrs) {
      Ember.deprecate(deprecation(key));
      let possibleCell = get(attrs, key);

      if (possibleCell && possibleCell[MUTABLE_CELL]) {
        return possibleCell.value();
      }

      return possibleCell;
    }
  }

  //setUnknownProperty(key) {

  //}
};

AttrsProxyMixin[INTERCEPT_SET] = function(obj, key, value) {
  let attrs = obj.attrs;

  if (key === 'attrs') { return UNHANDLED_SET; }
  if (!attrs || !(key in attrs)) {
    return UNHANDLED_SET;
  }

  let possibleCell = attrs[key];

  if (!possibleCell[MUTABLE_CELL]) {
    return UNHANDLED_SET;
    // This would ideally be an error, but there are cases where immutable
    // data from attrs is copied into local state, setting that
    // state is legitimate.
    //throw new Error(`You cannot set ${key} because attrs.${key} is not mutable`);
  }

  possibleCell.update(value);

  if (key in obj) {
    return UNHANDLED_SET;
  }

  return value;
};

export default Mixin.create(AttrsProxyMixin);

