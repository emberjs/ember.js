import AbstractRenderingTestCase from './abstract-rendering';
import { privatize as P } from 'container';

export default class RenderingTestCase extends AbstractRenderingTestCase {
  constructor() {
    super();
    let { owner } = this;

    this.env = owner.lookup('service:-glimmer-environment');
    let templateOptions = owner.lookup(P`template-options:main`);
    // get the runtime/lazy resolver from the compiler resolver;
    this.resolver = templateOptions.resolver.resolver;
  }
}
