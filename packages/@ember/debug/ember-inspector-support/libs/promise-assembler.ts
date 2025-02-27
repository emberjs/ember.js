/**
 Original implementation and the idea behind the `PromiseAssembler`,
 `Promise` model, and other work related to promise inspection was done
 by Stefan Penner (@stefanpenner) thanks to McGraw Hill Education (@mhelabs)
 and Yapp Labs (@yapplabs).
 */

import PromiseModel from '@ember/debug/ember-inspector-support/models/promise';
import RSVP from 'rsvp';
import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';
import Evented from '../utils/evented';

export type PromiseUpdatedEvent = {
  promise: PromiseModel;
};

export type PromiseChainedEvent = {
  promise: PromiseModel;
  child: PromiseModel;
};

class PromiseAssembler extends Evented.extend(BaseObject) {
  // RSVP lib to debug
  isStarted = false;
  declare RSVP: any;
  declare all: any[];
  declare promiseIndex: Record<string, number>;
  promiseChained: ((e: any) => void) | null = null;
  promiseRejected: ((e: any) => void) | null = null;
  promiseFulfilled: ((e: any) => void) | null = null;
  promiseCreated: ((e: any) => void) | null = null;

  static {
    this.prototype.RSVP = RSVP;
  }

  constructor(data?: any) {
    super(data);
    Evented.applyTo(this);
  }

  init() {
    super.init();
    this.all = [];
    this.promiseIndex = {};
  }

  start() {
    this.RSVP.configure('instrument', true);

    this.promiseChained = (e: any) => {
      chain.call(this, e);
    };
    this.promiseRejected = (e: any) => {
      reject.call(this, e);
    };
    this.promiseFulfilled = (e: any) => {
      fulfill.call(this, e);
    };
    this.promiseCreated = (e: any) => {
      create.bind(this)(e);
    };

    this.RSVP.on('chained', this.promiseChained);
    this.RSVP.on('rejected', this.promiseRejected);
    this.RSVP.on('fulfilled', this.promiseFulfilled);
    this.RSVP.on('created', this.promiseCreated);

    this.isStarted = true;
  }

  stop() {
    if (this.isStarted) {
      this.RSVP.configure('instrument', false);
      this.RSVP.off('chained', this.promiseChained);
      this.RSVP.off('rejected', this.promiseRejected);
      this.RSVP.off('fulfilled', this.promiseFulfilled);
      this.RSVP.off('created', this.promiseCreated);

      this.all.forEach((item) => {
        item.destroy();
      });

      this.all = [];
      this.promiseIndex = {};
      this.promiseChained = null;
      this.promiseRejected = null;
      this.promiseFulfilled = null;
      this.promiseCreated = null;
      this.isStarted = false;
    }
  }

  willDestroy() {
    this.stop();
    super.willDestroy();
  }

  createPromise(props: any) {
    let promise = new PromiseModel(props);
    let index = this.all.length;

    this.all.push(promise);
    this.promiseIndex[promise.guid] = index;
    return promise;
  }

  find(guid?: string) {
    if (guid) {
      const index = this.promiseIndex[guid];
      if (index !== undefined) {
        return this.all[index];
      }
    } else {
      return this.all;
    }
  }

  findOrCreate(guid: string) {
    return this.find(guid) || this.createPromise({ guid });
  }

  updateOrCreate(guid: string, properties: any) {
    let entry = this.find(guid);
    if (entry) {
      Object.assign(entry, properties);
    } else {
      properties = Object.assign({}, properties);
      properties.guid = guid;
      entry = this.createPromise(properties);
    }

    return entry;
  }
}

export default PromiseAssembler;

function fulfill(this: PromiseAssembler, event: any) {
  const guid = event.guid;
  const promise = this.updateOrCreate(guid, {
    label: event.label,
    settledAt: event.timeStamp,
    state: 'fulfilled',
    value: event.detail,
  });
  this.trigger('fulfilled', { promise } as PromiseUpdatedEvent);
}

function reject(this: PromiseAssembler, event: any) {
  const guid = event.guid;
  const promise = this.updateOrCreate(guid, {
    label: event.label,
    settledAt: event.timeStamp,
    state: 'rejected',
    reason: event.detail,
  });
  this.trigger('rejected', { promise } as PromiseUpdatedEvent);
}

function chain(this: PromiseAssembler, event: any) {
  let guid = event.guid;
  let promise = this.updateOrCreate(guid, {
    label: event.label,
    chainedAt: event.timeStamp,
  });
  let children = promise.children;
  let child = this.findOrCreate(event.childGuid);

  child.parent = promise;
  children.push(child);

  this.trigger('chained', { promise, child } as PromiseChainedEvent);
}

function create(this: PromiseAssembler, event: any) {
  const guid = event.guid;

  const promise = this.updateOrCreate(guid, {
    label: event.label,
    createdAt: event.timeStamp,
    stack: event.stack,
  });

  // todo fix ordering
  if (!promise.state) {
    promise.state = 'created';
  }
  this.trigger('created', { promise } as PromiseUpdatedEvent);
}
