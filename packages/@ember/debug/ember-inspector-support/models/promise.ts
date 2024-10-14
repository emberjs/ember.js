import { typeOf } from '@ember/debug/ember-inspector-support/utils/type-check';
import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';

const dateComputed = function () {
  return function (this: any, target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get(this: any): any {
        return this[`__${propertyKey}__`];
      },
      set(this: any, date: Date | number | string) {
        if (typeOf(date) === 'date') {
          this[`__${propertyKey}__`] = date;
          return;
        } else if (typeof date === 'number' || typeof date === 'string') {
          this[`__${propertyKey}__`] = new Date(date);
          return;
        }
        this[`__${propertyKey}__`] = null;
      },
    });
  };
};

export default class PromiseModel extends BaseObject {
  @dateComputed() createdAt: Date | null = null;
  @dateComputed() settledAt: Date | null = null;
  @dateComputed() chainedAt: Date | null = null;

  declare value: any;
  declare reason: any;
  guid = '';
  label = '';
  parent: PromiseModel | null = null;
  children = [];
  stack = [];
  state = '';

  get level(): number {
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
