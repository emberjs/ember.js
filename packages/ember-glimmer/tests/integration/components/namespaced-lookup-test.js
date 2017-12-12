import { moduleFor, RenderingTest } from '../../utils/test-case';
import { EMBER_MODULE_UNIFICATION } from 'ember/features';
import { Component } from 'ember-glimmer';

if (EMBER_MODULE_UNIFICATION) {

  moduleFor('Namespaced lookup', class extends RenderingTest {
    ['@test it can render a namespaced component']() {
      this.addTemplate({
        specifier: 'template:components/',
        rawString: 'my-addon::my-component'
      }, 'namespaced template {{myProp}}');

      this.add({
        specifier: 'component',
        rawString: 'my-addon::my-component'
      }, Component.extend({
        myProp: 'My property'
      }));

      this.addComponent('x-outer', { template: '{{my-addon::my-component}}' });

      this.render('{{x-outer}}');

      this.assertText('namespaced template My property');

      this.runTask(() => this.rerender());

      this.assertText('namespaced template My property');
    }

    ['@test it can render a nested namespaced component']() {
      this.addTemplate({
        specifier: 'template:components/',
        rawString: 'second-addon::my-component'
      }, 'second namespaced template');

      this.addTemplate({
        specifier: 'template:components/',
        rawString: 'first-addon::my-component'
      }, '{{second-addon::my-component}}');

      this.addComponent('x-outer', { template: '{{first-addon::my-component}}' });

      this.render('{{x-outer}}');

      this.assertText('second namespaced template');

      this.runTask(() => this.rerender());

      this.assertText('second namespaced template');
    }

    ['@test it can render a nested un-namespaced component']() {
      this.addTemplate({
        specifier: 'template:components/addon-component',
        referrer: 'template:/first-addon/src/ui/components/my-component'
      }, 'un-namespaced addon template');

      this.addTemplate({
        specifier: 'template:components/',
        // TODO: moduleNames really should have type, be specifiers.
        moduleName: '/first-addon/src/ui/components/my-component',
        rawString: 'first-addon::my-component'
      }, '{{addon-component}}');

      this.addComponent('x-outer', { template: '{{first-addon::my-component}}' });

      this.render('{{x-outer}}');

      this.assertText('un-namespaced addon template');

      this.runTask(() => this.rerender());

      this.assertText('un-namespaced addon template');
    }

    ['@test it can render a namespaced main component']() {
      this.addTemplate({
        specifier: 'template:components/addon-component',
        referrer: 'template:/first-addon/src/ui/components/main'
      }, 'Nested namespaced component');

      this.addTemplate({
        specifier: 'template:components/first-addon',
        moduleName: '/first-addon/src/ui/components/main'
      }, '{{addon-component}}');

      this.addComponent('x-outer', { template: '{{first-addon}}' });

      this.render('{{x-outer}}');

      this.assertText('Nested namespaced component');

      this.runTask(() => this.rerender());

      this.assertText('Nested namespaced component');
    }

  });
}
