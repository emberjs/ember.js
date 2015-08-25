import { Mixin } from 'ember-metal/mixin';
import { symbol } from 'ember-metal/utils';
import { PROPERTY_DID_CHANGE } from 'ember-metal/property_events';
import { on } from 'ember-metal/events';
import EmptyObject from 'ember-metal/empty_object';

export function deprecation(key) {
  return `You tried to look up an attribute directly on the component. This is deprecated. Use attrs.${key} instead.`;
}

export let MUTABLE_CELL = symbol('MUTABLE_CELL');

function isCell(val) {
  return val && val[MUTABLE_CELL];
}

function setupAvoidPropagating(instance) {
  // This caches the list of properties to avoid setting onto the component instance
  // inside `_propagateAttrsToThis`.  We cache them so that every instantiated component
  // does not have to pay the calculation penalty.
  let constructor = instance.constructor;
  if (!constructor.__avoidPropagating) {
    constructor.__avoidPropagating = new EmptyObject();
    let i, l;
    for (i = 0, l = instance.concatenatedProperties.length; i < l; i++) {
      let prop = instance.concatenatedProperties[i];

      constructor.__avoidPropagating[prop] = true;
    }

    for (i = 0, l = instance.mergedProperties.length; i < l; i++) {
      let prop = instance.mergedProperties[i];

      constructor.__avoidPropagating[prop] = true;
    }
  }
}

let AttrsProxyMixin = {
  attrs: null,

  init() {
    this._super(...arguments);

    setupAvoidPropagating(this);
  },

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

  _propagateAttrsToThis() {
    let attrs = this.attrs;

    for (let prop in attrs) {
      if (prop !== 'attrs' && !this.constructor.__avoidPropagating[prop]) {
        this.set(prop, this.getAttr(prop));
      }
    }
  },

  initializeShape: on('init', function() {
    this._isDispatchingAttrs = false;
  }),

  _internalDidReceiveAttrs() {
    this._super();
    this._isDispatchingAttrs = true;
    this._propagateAttrsToThis();
    this._isDispatchingAttrs = false;
  },


  unknownProperty(key) {
    if (this._isAngleBracket) { return; }

    var attrs = this.attrs;

    if (attrs && key in attrs) {
      // do not deprecate accessing `this[key]` at this time.
      // add this back when we have a proper migration path
      // deprecate(deprecation(key), { id: 'ember-views.', until: '3.0.0' });
      let possibleCell = attrs[key];

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
  if (this._isDispatchingAttrs) { return; }

  if (this._currentState) {
    this._currentState.legacyPropertyDidChange(this, key);
  }
};

export default Mixin.create(AttrsProxyMixin);
