export { TestCase, moduleFor } from './abstract-test-case';
import {
  ApplicationTest as AbstractApplicationTest,
  RenderingTest as AbstractRenderingTest
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

    owner.register('component-lookup:main', ComponentLookup);
    owner.register('service:-glimmer-environment', this.env, { instantiate: false });
    owner.inject('template', 'env', 'service:-glimmer-environment');
    owner.registerOptionsForType('helper', { instantiate: false });
    owner.registerOptionsForType('component', { singleton: false });
  }

  runTask(callback) {
    super.runTask(() => {
      callback();
      this.component.rerender();
    });
  }
}
