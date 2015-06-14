import { get } from "ember-metal/property_get";
//import { set } from "ember-metal/property_set";
import { Mixin } from "ember-metal/mixin";
import { on } from "ember-metal/events";
import { symbol } from "ember-metal/utils";
import objectKeys from "ember-metal/keys";
import { PROPERTY_DID_CHANGE } from "ember-metal/property_events";
//import run from "ember-metal/run_loop";

import {
  addObserver,
  removeObserver,
} from "ember-metal/observer";

export function deprecation(key) {
  return `You tried to look up an attribute directly on the component. This is deprecated. Use attrs.${key} instead.`;
}

export let MUTABLE_CELL = symbol("MUTABLE_CELL");

function isCell(val) {
  return val && val[MUTABLE_CELL];
}

function attrsWillChange(view, attrsKey) {
  let key = attrsKey.slice(6);
  view.currentState.legacyAttrWillChange(view, key);
}

function attrsDidChange(view, attrsKey) {
  let key = attrsKey.slice(6);
  view.currentState.legacyAttrDidChange(view, key);
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
    return isCell(val) ? val.value : val;
  },

  setAttr(key, value) {
    let attrs = this.attrs;
    let val = attrs[key];

    if (!isCell(val)) {
      throw new Error(`You can't update attrs.${key}, because it's not mutable`);
    }

    val.update(value);
  },

  willWatchProperty(key) {
    if (this._isAngleBracket || key === 'attrs') { return; }

    let attrsKey = `attrs.${key}`;
    addObserver(this, attrsKey, null, attrsDidChange);
  },

  didUnwatchProperty(key) {
    if (this._isAngleBracket || key === 'attrs') { return; }

    let attrsKey = `attrs.${key}`;
    removeObserver(this, attrsKey, null, attrsDidChange);
  },

  legacyDidReceiveAttrs: on('didReceiveAttrs', function() {
    if (this._isAngleBracket) { return; }

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
    if (this._isAngleBracket) { return; }

    var attrs = get(this, 'attrs');

    if (attrs && key in attrs) {
      // do not deprecate accessing `this[key]` at this time.
      // add this back when we have a proper migration path
      // Ember.deprecate(deprecation(key));
      let possibleCell = get(attrs, key);

      if (possibleCell && possibleCell[MUTABLE_CELL]) {
        return possibleCell.value;
      }

      return possibleCell;
    }
  }

  //setUnknownProperty(key) {

  //}
};

AttrsProxyMixin[PROPERTY_DID_CHANGE] = function(key) {
  if (this._isAngleBracket) { return; }

  if (this.currentState) {
    this.currentState.legacyPropertyDidChange(this, key);
  }
};

export default Mixin.create(AttrsProxyMixin);
