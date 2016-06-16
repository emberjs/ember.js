export { TestCase, moduleFor } from './abstract-test-case';
import {
  AbstractApplicationTest,
  AbstractRenderingTest
} from './abstract-test-case';
import assign from 'ember-metal/assign';
import { GLIMMER } from 'ember-application/system/engine';
import ComponentLookup from 'ember-views/component_lookup';

export class ApplicationTest extends AbstractApplicationTest {
  get applicationOptions() {
    return assign(super.applicationOptions, { [GLIMMER]: true });
  }
}

export class RenderingTest extends AbstractRenderingTest {
  constructor() {
    super();
    let { owner } = this;

    this.env = owner.lookup('service:-glimmer-environment');
    owner.register('component-lookup:main', ComponentLookup);
    owner.registerOptionsForType('helper', { instantiate: false });
    owner.registerOptionsForType('component', { singleton: false });
  }

  render(...args) {
    super.render(...args);
    this.renderer._root = this.component;
  }
}
