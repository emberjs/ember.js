import { ComponentLookup } from 'ember-views';

import AbstractRenderingTestCase from './abstract-rendering';

export default class RenderingTestCase extends AbstractRenderingTestCase {
  constructor() {
    super();
    let { owner } = this;

    this.env = owner.lookup('service:-glimmer-environment');
    owner.register('component-lookup:main', ComponentLookup);
    owner.registerOptionsForType('helper', { instantiate: false });
    owner.registerOptionsForType('component', { singleton: false });
  }
}
