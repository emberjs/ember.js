import { Environment } from "../htmlbars-runtime/hooks";
import { BaseReference, Reference } from "../htmlbars-runtime/reference";

export class TestBaseReference extends BaseReference {
  get(key) {
    return new TestPropertyReference(this._value, key);
  }
}

export class TestPropertyReference extends Reference {
  constructor(object, key) {
    super();
    this._object = object;
    this._key = key;
    this._lastValue = null;
  }

  isDirty() {
    return this._object[this._key] !== this._lastValue;
  }

  value() {
    return this._object[this._key];
  }
}

export class TestEnvironment extends Environment {
  constructor(options) {
    super(options);
    this._helpers = {};
  }

  registerHelper(name, helper) {
    this._helpers[name] = helper;
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this._helpers;
  }

  lookupHelper(scope, helperName) {
    return this._helpers[helperName[0]];
  }
}