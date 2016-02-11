export { TestCase, moduleFor } from './abstract-test-case';
import { RenderingTest as AbstractRenderingTest } from './abstract-test-case';
import ComponentLookup from 'ember-views/component_lookup';

export class RenderingTest extends AbstractRenderingTest {
  constructor() {
    super();

    let { owner } = this;

    owner.register('component-lookup:main', ComponentLookup);
    owner.registerOptionsForType('helper', { instantiate: false });
    owner.registerOptionsForType('template', { instantiate: false });
    owner.registerOptionsForType('component', { singleton: false });
  }
}
