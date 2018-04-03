import AbstractRenderingTestCase from './abstract-rendering';
import { privatize as P } from 'container';

export default class RenderingTestCase extends AbstractRenderingTestCase {
  constructor() {
    super(...arguments);
    let { owner } = this;

    this.env = owner.lookup('service:-glimmer-environment');
    this.templateOptions = owner.lookup(P`template-compiler:main`);
    this.compileTimeLookup = this.templateOptions.resolver;
    this.runtimeResolver = this.compileTimeLookup.resolver;
  }
}
