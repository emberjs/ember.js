import { typeOf } from '@ember/debug/ember-inspector-support/utils/type-check';
import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';

const dateComputed = function () {
  return function (target, propertyKey) {
    return {
      get() {
        return this[`__${propertyKey}__`];
      },
      set(date) {
        if (typeOf(date) === 'date') {
          this[`__${propertyKey}__`] = date;
          return;
        } else if (typeof date === 'number' || typeof date === 'string') {
          this[`__${propertyKey}__`] = new Date(date);
          return;
        }
        this[`__${propertyKey}__`] = null;
      },
    };
  };
};

export default class extends BaseObject {
  @dateComputed() createdAt;
  @dateComputed() settledAt;
  @dateComputed() chainedAt;

  parent = null;
  children = [];

  get level() {
    const parent = this.parent;
    if (!parent) {
      return 0;
    }
    return parent.level + 1;
  }

  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }
  get isFulfilled() {
    return this.state === 'fulfilled';
  }
  get isRejected() {
    return this.state === 'rejected';
  }
}
