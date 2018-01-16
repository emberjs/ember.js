import AbstractRenderingTestCase from './abstract-rendering';

export default class RenderingTestCase extends AbstractRenderingTestCase {
  constructor() {
    super();
    let { owner } = this;

    this.env = owner.lookup('service:-glimmer-environment');
  }
}
