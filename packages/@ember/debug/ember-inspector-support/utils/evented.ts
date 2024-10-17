const ListenersSymbol = Symbol('listeners');
const EventedSymbol = Symbol('evented');

type ClassConstructor<T> = new (...args: any[]) => T;

export default class Evented {
  [ListenersSymbol]: Record<
    string,
    { target: any; method: string | Function; once?: boolean | undefined }[]
  > = {};

  on(name: string, target: any, method: string | Function) {
    this[ListenersSymbol][name] = this[ListenersSymbol][name] || [];
    this[ListenersSymbol][name]!.push({
      target: (method && target) || null,
      method: (target && method) || target,
    });
    return this;
  }

  one(name: string, target: any, method: string | Function) {
    this.on(name, target, method);
    this[ListenersSymbol][name]!.slice(-1)[0]!.once = true;
    return this;
  }

  trigger(name: string, ...args: any) {
    (this[ListenersSymbol][name] || []).forEach((l) => {
      let m = l.method;
      if (typeof l.method !== 'function') {
        m = l.target[l.method];
      }
      (m as Function).call(l.target, ...args);
      if (l.once) {
        const idx = this[ListenersSymbol][name]!.indexOf(l);
        this[ListenersSymbol][name]!.splice(idx, 1);
      }
    });
  }

  off(name: string, target: any, method: string | Function) {
    if (!method) {
      method = target;
      target = null;
    }
    const listeners = this[ListenersSymbol][name] || [];
    const idx = listeners.findIndex((l) => l.target === target && l.method === method);
    if (idx >= 0) {
      listeners.splice(idx, 1);
    }
    return this;
  }

  has(name: string) {
    const listeners = this[ListenersSymbol][name] || [];
    return listeners.length > 0;
  }

  static extend<Statics, Instance, M>(
    this: Statics & ClassConstructor<Instance>,
    klass: M
  ): Readonly<Statics> & ClassConstructor<Instance> & M extends infer T ? T & Evented : unknown;

  static extend(klass: any) {
    const k = class extends klass {};
    Evented.applyTo(k.prototype);
    return k;
  }

  static applyTo(instance: any) {
    const e = new Evented();
    instance[EventedSymbol] = e;
    instance.one = e.one.bind(e);
    instance.on = e.on.bind(e);
    instance.trigger = e.trigger.bind(e);
    instance.off = e.off.bind(e);
    instance.has = e.has.bind(e);
  }
}
