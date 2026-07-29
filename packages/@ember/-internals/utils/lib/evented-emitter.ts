import { assert } from '@ember/debug';

interface Listener {
  target: object | null;
  method: Function | string;
  once: boolean;
}

/**
  A minimal event emitter matching the observable semantics of the `Evented`
  mixin backed by metal's event system: most-recently-added listeners fire
  first, `once` listeners are removed before invocation, listeners without a
  target are invoked with the host as `this`, and string methods are resolved
  on the target at trigger time.

  Owned by composition rather than mixed in, so hosts can expose the classic
  `on`/`one`/`off`/`trigger`/`has` API without inheriting from `Evented`.

  @private
*/
export class EventedEmitter {
  private listeners = new Map<string, Listener[]>();

  constructor(private host: object) {}

  on(
    eventName: string,
    targetOrMethod: object | Function | string,
    method?: Function | string
  ): void {
    this.addListener(eventName, targetOrMethod, method, false);
  }

  one(
    eventName: string,
    targetOrMethod: object | Function | string,
    method?: Function | string
  ): void {
    this.addListener(eventName, targetOrMethod, method, true);
  }

  off(
    eventName: string,
    targetOrMethod: object | Function | string,
    method?: Function | string
  ): void {
    let [target, resolvedMethod] = normalize(eventName, targetOrMethod, method);
    let list = this.listeners.get(eventName);
    if (list === undefined) {
      return;
    }
    let index = indexOfListener(list, target, resolvedMethod);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  trigger(eventName: string, ...args: unknown[]): void {
    let list = this.listeners.get(eventName);
    if (list === undefined || list.length === 0) {
      return;
    }

    // snapshot so mutation during delivery doesn't affect this dispatch;
    // reverse iteration matches metal's sendEvent
    let snapshot = list.slice();
    for (let i = snapshot.length - 1; i >= 0; i--) {
      let listener = snapshot[i]!;
      let { target, method, once } = listener;

      if (once) {
        let index = list.indexOf(listener);
        if (index === -1) {
          // already removed by an earlier listener in this dispatch
          continue;
        }
        list.splice(index, 1);
      }

      let resolvedTarget = target ?? this.host;
      let fn = typeof method === 'string' ? (resolvedTarget as any)[method] : method;

      assert(
        `Could not resolve listener method '${String(method)}' for event '${eventName}'`,
        typeof fn === 'function'
      );

      fn.apply(resolvedTarget, args);
    }
  }

  has(eventName: string): boolean {
    let list = this.listeners.get(eventName);
    return list !== undefined && list.length > 0;
  }

  private addListener(
    eventName: string,
    targetOrMethod: object | Function | string,
    method: Function | string | undefined,
    once: boolean
  ): void {
    let [target, resolvedMethod] = normalize(eventName, targetOrMethod, method);
    let list = this.listeners.get(eventName);
    if (list === undefined) {
      list = [];
      this.listeners.set(eventName, list);
    }
    if (indexOfListener(list, target, resolvedMethod) === -1) {
      list.push({ target, method: resolvedMethod, once });
    }
  }
}

function normalize(
  eventName: string,
  targetOrMethod: object | Function | string,
  method: Function | string | undefined
): [target: object | null, method: Function | string] {
  assert('You must pass an event name', Boolean(eventName));
  if (method === undefined) {
    // string methods without a target resolve on the host at trigger time
    assert(
      'You must pass a function or method name listener when no target is given',
      typeof targetOrMethod === 'function' || typeof targetOrMethod === 'string'
    );
    return [null, targetOrMethod];
  }
  return [targetOrMethod as object, method];
}

function indexOfListener(
  list: Listener[],
  target: object | null,
  method: Function | string
): number {
  return list.findIndex((listener) => listener.target === target && listener.method === method);
}
