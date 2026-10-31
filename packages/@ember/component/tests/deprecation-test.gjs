import {
  moduleFor,
  RenderingTestCase,
  expectDeprecation,
  expectNoDeprecation,
  testUnless,
} from 'internal-test-helpers';

import ClassicComponent, {
  setComponentTemplate,
  getComponentTemplate,
  setComponentManager,
  capabilities,
} from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { precompileTemplate } from '@ember/template-compilation';
import GlimmerComponent from '@glimmer/component';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

const { isEnabled, isRemoved } = DEPRECATIONS.DEPRECATE_EMBER_COMPONENT;

const MESSAGE = /The classic `Component` class from `@ember\/component` is deprecated/;

moduleFor(
  'Deprecation: ember-component',
  class extends RenderingTestCase {
    [`${testUnless(isRemoved)} @test rendering a Component.extend() subclass is deprecated`]() {
      let Greeting = ClassicComponent.extend({ tagName: '' });

      this.owner.register(
        'component:greeting',
        setComponentTemplate(precompileTemplate('hello'), Greeting)
      );

      expectDeprecation(() => this.render('<Greeting />'), MESSAGE, isEnabled);

      this.assertText('hello');
    }

    [`${testUnless(isRemoved)} @test rendering a native subclass of Component is deprecated`]() {
      class Greeting extends ClassicComponent {}

      this.owner.register(
        'component:greeting',
        setComponentTemplate(precompileTemplate('hello'), Greeting)
      );

      expectDeprecation(() => this.render('<Greeting />'), MESSAGE, isEnabled);

      this.assertText('hello');
    }

    ['@test Glimmer components are not deprecated']() {
      class Greeting extends GlimmerComponent {
        <template>hello</template>
      }

      expectNoDeprecation(() => {
        this.renderComponent(<template><Greeting /></template>, { expect: 'hello' });
      });
    }

    ['@test template-only components are not deprecated']() {
      const Greeting = setComponentTemplate(precompileTemplate('hello'), templateOnly());

      expectNoDeprecation(() => {
        this.renderComponent(<template><Greeting /></template>, { expect: 'hello' });
      });
    }

    ['@test the named exports of @ember/component are not deprecated'](assert) {
      expectNoDeprecation(() => {
        let template = precompileTemplate('hello');
        let Greeting = setComponentTemplate(template, templateOnly());

        assert.strictEqual(getComponentTemplate(Greeting), template);

        class Manager {
          capabilities = capabilities('3.13');
        }

        setComponentManager(() => new Manager(), class {});
      });
    }
  }
);
