'use strict';
const path = require('path');
const distRoot = path.join(__dirname, '../../../dist/packages');
function p(...parts) {
  return path.join(distRoot, ...parts);
}

let cachedModules = null;

async function loadEmberModules() {
  if (cachedModules) return cachedModules;

  const [
    appMod,
    appInstanceMod,
    routerMod,
    routeMod,
    componentMod,
    templateOnlyMod,
    controllerMod,
    objectMod,
    serviceMod,
    runloopMod,
    rsvpMod,
    templateFactoryMod,
    templateCompilerMod,
    instrumentationMod,
    runtimeMod,
    containerMod,
  ] = await Promise.all([
    import(p('@ember/application/index.js')),
    import(p('@ember/application/instance.js')),
    import(p('@ember/routing/router.js')),
    import(p('@ember/routing/route.js')),
    import(p('@ember/component/index.js')),
    import(p('@ember/component/template-only.js')),
    import(p('@ember/controller/index.js')),
    import(p('@ember/object/index.js')),
    import(p('@ember/service/index.js')),
    import(p('@ember/runloop/index.js')),
    import(p('rsvp/index.js')),
    import(p('@ember/template-factory/index.js')),
    import(p('ember-template-compiler/index.js')),
    import(p('@ember/instrumentation/index.js')),
    import(p('@ember/-internals/runtime/index.js')),
    import(p('@ember/-internals/container/index.js')),
  ]);

  function compile(templateString, options) {
    const spec = templateCompilerMod.precompile(templateString, options);
    const template = new Function('return ' + spec)();
    return templateFactoryMod.createTemplateFactory(template);
  }

  cachedModules = {
    Application: appMod.default,
    ApplicationInstance: appInstanceMod.default,
    Router: routerMod.default,
    Route: routeMod.default,
    Component: componentMod.default,
    setComponentTemplate: componentMod.setComponentTemplate,
    templateOnly: templateOnlyMod.default,
    Controller: controllerMod.default,
    EmberObject: objectMod.default,
    service: serviceMod.service,
    run: runloopMod.run,
    all: rsvpMod.all,
    createTemplateFactory: templateFactoryMod.createTemplateFactory,
    precompile: templateCompilerMod.precompile,
    instrument: instrumentationMod.instrument,
    resetInstrumentation: instrumentationMod.reset,
    RegistryProxyMixin: runtimeMod.RegistryProxyMixin,
    ContainerProxyMixin: runtimeMod.ContainerProxyMixin,
    Registry: containerMod.Registry,
    compile,
  };
  return cachedModules;
}

module.exports = { loadEmberModules };
