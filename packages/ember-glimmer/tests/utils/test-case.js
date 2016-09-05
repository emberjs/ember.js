export { TestCase, moduleFor } from './abstract-test-case';
import {
  AbstractApplicationTest,
  AbstractRenderingTest
} from './abstract-test-case';
import { ComponentLookup } from 'ember-views';

export class ApplicationTest extends AbstractApplicationTest {
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
}
