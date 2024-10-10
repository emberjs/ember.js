const ListenersSymbol = Symbol('listeners');
const EventedSymbol = Symbol('evented');

export default class Evented {
  [ListenersSymbol] = {};

  on(name, target, method) {
    this[ListenersSymbol][name] = this[ListenersSymbol][name] || [];
    this[ListenersSymbol][name].push({
      target: (method && target) || null,
      method: (target && method) || target,
    });
    return this;
  }

  one(name, target, method) {
    this.on(name, target, method);
    this[ListenersSymbol][name].slice(-1)[0].once = true;
    return this;
  }

  trigger(name, ...args) {
    (this[ListenersSymbol][name] || []).forEach((l) => {
      let m = l.method;
      if (typeof l.method !== 'function') {
        m = l.target[l.method];
      }
      m.call(l.target, ...args);
      if (l.once) {
        const idx = this[ListenersSymbol][name].indexOf(l);
        this[ListenersSymbol][name].splice(idx, 1);
      }
    });
  }

  off(name, target, method) {
    if (!method) {
      method = target;
      target = null;
    }
    const listeners = this[ListenersSymbol][name] || [];
    const idx = listeners.findIndex(
      (l) => l.target === target && l.method === method
    );
    if (idx >= 0) {
      listeners.splice(idx, 1);
    }
    return this;
  }

  has(name) {
    const listeners = this[ListenersSymbol][name] || [];
    return listeners.length > 0;
  }

  static applyTo(instance) {
    const e = new Evented();
    instance[EventedSymbol] = e;
    instance.one = e.one.bind(e);
    instance.on = e.on.bind(e);
    instance.trigger = e.trigger.bind(e);
    instance.off = e.off.bind(e);
    instance.has = e.has.bind(e);
  }
}
