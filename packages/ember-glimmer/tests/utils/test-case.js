export { TestCase, moduleFor } from './abstract-test-case';
import Environment from './environment';
import { DOMHelper, Renderer, compile } from './helpers';
import {
  ApplicationTest as AbstractApplicationTest,
  RenderingTest as AbstractRenderingTest
} from './abstract-test-case';
import { OutletView } from 'ember-glimmer/ember-routing-view';
import ComponentLookup from 'ember-views/component_lookup';
import { INTERNAL_BOOT_OPTIONS } from 'ember-application/system/application-instance';

export class ApplicationTest extends AbstractApplicationTest {
  constructor() {
    super();

    let { application } = this;

    let dom = new DOMHelper(document);
    let env = new Environment({ dom, owner: application });

    application.registerOptionsForType('helper', { instantiate: false });
    application.registerOptionsForType('template', { instantiate: true });
    application.registerOptionsForType('component', { singleton: false });

    application.register('service:-glimmer-env', env, { instantiate: false });
    application.register('template:-outlet', compile('{{outlet}}'));
    application.register('view:-outlet', OutletView);
    application.register('component-lookup:main', ComponentLookup);

    application.inject('template', 'env', 'service:-glimmer-env');
    application.inject('view:-outlet', 'template', 'template:-outlet');

    this.bootOptions = {
      [INTERNAL_BOOT_OPTIONS]: {
        renderer: {
          create() {
            return new Renderer(dom, { destinedForDOM: true, env });
          }
        }
      }
    };
  }
}

export class RenderingTest extends AbstractRenderingTest {
  constructor() {
    super();

    let { owner } = this;

    owner.register('component-lookup:main', ComponentLookup);
    owner.register('service:-glimmer-env', this.env, { instantiate: false });
    owner.inject('template', 'env', 'service:-glimmer-env');
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
