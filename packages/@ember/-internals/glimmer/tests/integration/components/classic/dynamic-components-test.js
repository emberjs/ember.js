import {
  moduleFor,
  RenderingTestCase,
  runTask,
  expectClassicComponentDeprecation,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { Component as EmberComponent } from '../../../utils/helpers';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  moduleFor(
    'Components test: dynamic components (classic component)',
    class extends RenderingTestCase {
      ['@test it has an element']() {
        expectClassicComponentDeprecation();

        let instance;

        let FooBarComponent = class extends EmberComponent {
          init() {
            super.init();
            instance = this;
          }
        };

        this.owner.register(
          'component:foo-bar',
          setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
        );

        this.render('{{component "foo-bar"}}');

        let element1 = instance.element;

        this.assertComponentElement(element1, { content: 'hello' });

        runTask(() => this.rerender());

        let element2 = instance.element;

        this.assertComponentElement(element2, { content: 'hello' });

        this.assertSameNode(element2, element1);
      }

      ['@test it has the right parentView and childViews'](assert) {
        expectClassicComponentDeprecation();

        let fooBarInstance, fooBarBazInstance;

        let FooBarComponent = class extends EmberComponent {
          init() {
            super.init();
            fooBarInstance = this;
          }
        };

        let FooBarBazComponent = class extends EmberComponent {
          init() {
            super.init();
            fooBarBazInstance = this;
          }
        };

        this.owner.register(
          'component:foo-bar',
          setComponentTemplate(precompileTemplate('foo-bar {{foo-bar-baz}}'), FooBarComponent)
        );
        this.owner.register(
          'component:foo-bar-baz',
          setComponentTemplate(precompileTemplate('foo-bar-baz'), FooBarBazComponent)
        );

        this.render('{{component "foo-bar"}}');
        this.assertText('foo-bar foo-bar-baz');

        assert.equal(fooBarInstance.parentView, this.component);
        assert.equal(fooBarBazInstance.parentView, fooBarInstance);

        assert.deepEqual(this.component.childViews, [fooBarInstance]);
        assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);

        runTask(() => this.rerender());
        this.assertText('foo-bar foo-bar-baz');

        assert.equal(fooBarInstance.parentView, this.component);
        assert.equal(fooBarBazInstance.parentView, fooBarInstance);

        assert.deepEqual(this.component.childViews, [fooBarInstance]);
        assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);
      }
    }
  );
}
