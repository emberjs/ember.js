import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { Object as EmberObject } from '@ember/-internals/runtime';
import { GLIMMER_MODIFIER_MANAGER } from '@ember/canary-features';
import { setModifierManager } from '@ember/-internals/glimmer';
import { set } from '@ember/-internals/metal';

if (GLIMMER_MODIFIER_MANAGER) {
  class ModifierManagerTest extends RenderingTestCase {}

  class CustomModifierManager {
    constructor(owner) {
      this.owner = owner;
    }

    createModifier(factory, args) {
      return factory.create(args);
    }

    installModifier(instance, element, args) {
      instance.element = element;
      let { positional, named } = args;
      instance.didInsertElement(positional, named);
    }

    updateModifier(instance, args) {
      let { positional, named } = args;
      instance.didUpdate(positional, named);
    }

    destroyModifier(instance) {
      instance.willDestroyElement();
    }
  }

  moduleFor(
    'Basic Custom Modifier Manager',
    class extends ModifierManagerTest {
      '@test can register a custom element modifier and render it'(assert) {
        let ModifierClass = setModifierManager(
          owner => {
            return new CustomModifierManager(owner);
          },
          EmberObject.extend({
            didInsertElement() {},
            didUpdate() {},
            willDestroyElement() {},
          })
        );

        this.registerModifier(
          'foo-bar',
          ModifierClass.extend({
            didInsertElement() {
              assert.ok(true, 'Called didInsertElement');
            },
          })
        );

        this.render('<h1 {{foo-bar}}>hello world</h1>');
        this.assertHTML(`<h1>hello world</h1>`);
      }

      '@test custom lifecycle hooks'(assert) {
        assert.expect(9);
        let ModifierClass = setModifierManager(
          owner => {
            return new CustomModifierManager(owner);
          },
          EmberObject.extend({
            didInsertElement() {},
            didUpdate() {},
            willDestroyElement() {},
          })
        );

        this.registerModifier(
          'foo-bar',
          ModifierClass.extend({
            didUpdate([truthy]) {
              assert.ok(true, 'Called didUpdate');
              assert.equal(truthy, 'true', 'gets updated args');
            },
            didInsertElement([truthy]) {
              assert.ok(true, 'Called didInsertElement');
              assert.equal(truthy, true, 'gets initial args');
            },
            willDestroyElement() {
              assert.ok(true, 'Called willDestroyElement');
            },
          })
        );

        this.render('{{#if truthy}}<h1 {{foo-bar truthy}}>hello world</h1>{{/if}}', {
          truthy: true,
        });
        this.assertHTML(`<h1>hello world</h1>`);

        runTask(() => set(this.context, 'truthy', 'true'));

        runTask(() => set(this.context, 'truthy', false));

        runTask(() => set(this.context, 'truthy', true));
      }

      '@test associates manager even through an inheritance structure'(assert) {
        assert.expect(5);
        let ModifierClass = setModifierManager(
          owner => {
            return new CustomModifierManager(owner);
          },
          EmberObject.extend({
            didInsertElement() {},
            didUpdate() {},
            willDestroyElement() {},
          })
        );

        ModifierClass = ModifierClass.extend({
          didInsertElement([truthy]) {
            this._super(...arguments);
            assert.ok(true, 'Called didInsertElement');
            assert.equal(truthy, true, 'gets initial args');
          },
        });

        this.registerModifier(
          'foo-bar',
          ModifierClass.extend({
            didInsertElement([truthy]) {
              this._super(...arguments);
              assert.ok(true, 'Called didInsertElement');
              assert.equal(truthy, true, 'gets initial args');
            },
          })
        );

        this.render('<h1 {{foo-bar truthy}}>hello world</h1>', {
          truthy: true,
        });
        this.assertHTML(`<h1>hello world</h1>`);
      }

      '@test can give consistent access to underlying DOM element'(assert) {
        assert.expect(4);
        let ModifierClass = setModifierManager(
          owner => {
            return new CustomModifierManager(owner);
          },
          EmberObject.extend({
            didInsertElement() {},
            didUpdate() {},
            willDestroyElement() {},
          })
        );

        this.registerModifier(
          'foo-bar',
          ModifierClass.extend({
            savedElement: undefined,
            didInsertElement() {
              assert.equal(this.element.tagName, 'H1');
              this.set('savedElement', this.element);
            },
            didUpdate() {
              assert.equal(this.element, this.savedElement);
            },
            willDestroyElement() {
              assert.equal(this.element, this.savedElement);
            },
          })
        );

        this.render('<h1 {{foo-bar truthy}}>hello world</h1>', {
          truthy: true,
        });
        this.assertHTML(`<h1>hello world</h1>`);

        runTask(() => set(this.context, 'truthy', 'true'));
      }
    }
  );
}
