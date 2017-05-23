function NOOP() {}

/**
  @module ember
  @submodule ember-glimmer
*/

/**
  Represents the internal state of the component.

  @class ComponentStateBucket
  @private
*/
export default class ComponentStateBucket {
  constructor(environment, component, args, finalizer) {
    this.environment = environment;
    this.component = component;
    this.classRef = null;
    this.args = args;
    this.argsRevision = args.tag.value();
    this.finalizer = finalizer;
  }

  destroy() {
    let { component, environment } = this;

    if (environment.isInteractive) {
      component.trigger('willDestroyElement');
      component.trigger('willClearRender');
    }

    environment.destroyedComponents.push(component);
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}
