import { guid, intern } from '../utils';
import { DirectReference } from './property-access';

export default class RootReference {
  constructor(parent) {
    this._guid = guid();
    this._parent = parent;
    this._chains = {};
  }

  isDirty() { return false; }

  value() { return this._parent; }

  get(prop) {
    var _chains = this._chains;
    if (prop in _chains) return _chains[prop];
    return (_chains[prop] = new DirectReference(this, prop));
  }

  path(string) {
    return string.split('.').reduce((ref, part) => ref.get(intern(part)), this);
  }

  referenceFromInternedParts(parts) {
    return parts.reduce((ref, part) => ref.get(part), this);
  }

  label() {
    return '[reference Root]';
  }
}

