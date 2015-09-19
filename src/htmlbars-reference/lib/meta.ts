import { dict, DictSet } from './utils';
import { PropertyReference } from './references/descriptors';
import RootReference from './references/root';

class Meta {
  static for(obj) {
    if (obj._meta) return obj._meta;

    let MetaToUse = obj.constructor._Meta || Meta;
    return (obj._meta = new MetaToUse(obj));
  }

  constructor(object) {
    this._object = object;
    this._references = null;
    this._root = null;
    this._referenceTypes = null;
  }

  addReference(property, reference) {
    var refs = this._references = this._references || dict();
    var set = refs[property] = refs[property] || new DictSet();
    set.add(reference);
  }

  addReferenceTypeFor(property, type) {
    this._referenceTypes = this._referenceTypes || dict();
    this._referenceTypes[property] = type;
  }

  referenceTypeFor(property) {
    if (!this._referenceTypes) return PropertyReference;
    return this._referenceTypes[property] || PropertyReference;
  }

  removeReference(property, reference) {
    if (!this._references) return;
    var set = this._references[property];
    set.remove(reference);
  }

  referencesFor(property) {
    if (!this._references) return;
    return this._references[property];
  }

  root() {
    return (this._root = this._root || new RootReference(this._object));
  }
}

export default Meta;

class SealedMeta extends Meta {
  addReferenceTypeFor(...args) { //jshint ignore:line
    throw new Error("Cannot modify reference types on a sealed meta");
  }
}

class BlankMeta extends SealedMeta {
  referenceTypeFor(...args) { //jshint ignore:line
    return PropertyReference;
  }

}

export class MetaBuilder {
  constructor() {
    this._referenceTypes = null;
  }

  addReferenceTypeFor(property, type) {
    this._referenceTypes = this._referenceTypes || dict();
    this._referenceTypes[property] = type;
  }

  seal() {
    if (!this._referenceTypes) return BlankMeta;
    return buildMeta(turbocharge(this._referenceTypes));
  }
}

function buildMeta(_referenceTypes) {
  return class extends SealedMeta {
    constructor(object, RootReference, PropertyReference) {
      super(object, RootReference, PropertyReference);
      this._referenceTypes = _referenceTypes;
    }

    referenceTypeFor(property) {
      return this._referenceTypes[property] || PropertyReference;
    }
  };
}

function turbocharge(obj) {
  function Dummy() {}
  Dummy.prototype = obj;
  return obj;
}

export function metaFor(obj) {
  return Meta.for(obj);
}
