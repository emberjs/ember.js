// eslint-disable-next-line no-var, @typescript-eslint/no-unused-vars
var emberInspectorLoader: any;

globalThis.emberInspectorLoader = {
  // eslint-disable-next-line disable-features/disable-async-await
  async load() {
    // TODO we probably want to be more careful about what we expose here
    return {
      Application: await import('@ember/application'),
      ApplicationNamespace: await import('@ember/application/namespace'),
      Array: await import('@ember/array'),
      ArrayMutable: await import('@ember/array/mutable'),
      ArrayProxy: await import('@ember/array/proxy'),
      Component: await import('@ember/component'),
      Controller: await import('@ember/controller'),
      Debug: await import('@ember/debug'),
      EmberObject: await import('@ember/object'),
      EnumerableMutable: await import('@ember/enumerable/mutable'),
      InternalsEnvironment: await import('@ember/-internals/environment'),
      InternalsMeta: await import('@ember/-internals/meta'),
      InternalsMetal: await import('@ember/-internals/metal'),
      InternalsUtils: await import('@ember/-internals/utils'),
      Instrumentation: await import('@ember/instrumentation'),
      Object: await import('@ember/object'),
      ObjectCore: await import('@ember/object/core'),
      ObjectInternals: await import('@ember/object/internals'),
      ObjectEvented: await import('@ember/object/evented'),
      ObjectObservable: await import('@ember/object/observable'),
      ObjectPromiseProxyMixin: await import('@ember/object/promise-proxy-mixin'),
      ObjectProxy: await import('@ember/object/proxy'),
      Service: await import('@ember/service'),
      VERSION: await import('ember/version'),
      RSVP: await import('rsvp'),
    };
  },
};
