import { moduleFor, RenderingTest } from '../../utils/test-case';
import { EMBER_MODULE_UNIFICATION } from 'ember/features';
import { Component, helper } from 'ember-glimmer';

if (EMBER_MODULE_UNIFICATION) {

  moduleFor('Namespaced lookup', class extends RenderingTest {
    ['@test it can render a namespaced component']() {
      this.addTemplate({
        specifier: 'template:components/my-component',
        namespace: 'my-addon'
      }, 'namespaced template {{myProp}}');

      this.add({
        specifier: 'component:my-component',
        namespace: 'my-addon'
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
        specifier: 'template:components/my-component',
        namespace: 'second-addon'
      }, 'second namespaced template');

      this.addTemplate({
        specifier: 'template:components/my-component',
        namespace: 'first-addon'
      }, 'first namespaced template - {{second-addon::my-component}}');

      this.addComponent('x-outer', { template: '{{first-addon::my-component}}' });

      this.render('{{x-outer}}');

      this.assertText('first namespaced template - second namespaced template');

      this.runTask(() => this.rerender());

      this.assertText('first namespaced template - second namespaced template');
    }

    ['@test it can render a nested un-namespaced component']() {
      this.addTemplate({
        specifier: 'template:components/addon-component',
        source: 'template:first-addon/src/ui/components/my-component.hbs'
      }, 'un-namespaced addon template');

      this.addTemplate({
        specifier: 'template:components/my-component',
        moduleName: 'first-addon/src/ui/components/my-component.hbs',
        namespace: 'first-addon'
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
        soruce: 'template:first-addon/src/ui/components/main.hbs'
      }, 'Nested namespaced component');

      this.addTemplate({
        specifier: 'template:components/first-addon',
        moduleName: 'first-addon/src/ui/components/main.hbs'
      }, '{{addon-component}}');

      this.addComponent('x-outer', { template: '{{first-addon}}' });

      this.render('{{x-outer}}');

      this.assertText('Nested namespaced component');

      this.runTask(() => this.rerender());

      this.assertText('Nested namespaced component');
    }

    ['@test it does not render a main component when using a namespace']() {
      this.addTemplate({
        specifier: 'template:components/main',
        namespace: 'my-addon'
      }, 'namespaced template {{myProp}}');

      this.add({
        specifier: 'component:main',
        namespace: 'my-addon'
      }, Component.extend({
        myProp: 'My property'
      }));

      this.add({
        specifier: 'helper:my-addon',
        namespace: 'empty-namespace'

      }, helper(() => 'my helper'));

      this.render('{{empty-namespace::my-addon}}');

      this.assertText('my helper'); // component should be not found

      this.runTask(() => this.rerender());

      this.assertText('my helper');
    }

    ['@test it renders a namespaced helper']() {
      this.add({
        specifier: 'helper:my-helper',
        namespace: 'my-namespace'
      }, helper(() => 'my helper'));

      this.render('{{my-namespace::my-helper}}');

      this.assertText('my helper');

      this.runTask(() => this.rerender());

      this.assertText('my helper');
    }
  });
}
