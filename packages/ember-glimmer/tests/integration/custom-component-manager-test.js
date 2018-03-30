import { moduleFor, RenderingTest } from '../utils/test-case';
import { strip } from '../utils/abstract-test-case';
import { Component } from '../utils/helpers';

import { Object as EmberObject } from 'ember-runtime';
import { set, setProperties, computed } from 'ember-metal';
import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from 'ember/features';
import { componentManager } from 'ember-glimmer';
import { getChildViews } from 'ember-views';
import { assign } from 'ember-utils';

const MANAGER_ID = 'test-custom';

const CustomComponent = componentManager(EmberObject.extend(), MANAGER_ID);

if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
  moduleFor(
    'Components test: curly components with custom manager',
    class extends RenderingTest {
      /*
     * Helper to register a custom component manager. Provides a basic, default
     * implementation of the custom component manager API, but can be overridden
     * by passing custom hooks.
     */
      registerCustomComponentManager(overrides = {}) {
        let options = assign(
          {
            version: '3.1',
            create({ ComponentClass }) {
              return ComponentClass.create();
            },

            getContext(component) {
              return component;
            },

            update() {},
          },
          overrides
        );

        this.owner.register(`component-manager:${MANAGER_ID}`, options, {
          singleton: true,
          instantiate: false,
        });
      }

      // Renders a simple component with a custom component manager and verifies
      // that properties from the component are accessible from the component's
      // template.
      ['@test it can render a basic component with custom component manager']() {
        this.registerCustomComponentManager();

        let ComponentClass = CustomComponent.extend({
          greeting: 'hello',
        });

        this.registerComponent('foo-bar', {
          template: `<p>{{greeting}} world</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(strip`<p>hello world</p>`);
      }

      // Tests the custom component manager's ability to override template context
      // by implementing the getContext hook. Test performs an initial render and
      // updating render and verifies that output came from the custom context,
      // not the component instance.
      ['@test it can customize the template context']() {
        let customContext = {
          greeting: 'goodbye',
        };

        this.registerCustomComponentManager({
          getContext() {
            return customContext;
          },
        });

        let ComponentClass = CustomComponent.extend({
          greeting: 'hello',
          count: 1234,
        });

        this.registerComponent('foo-bar', {
          template: `<p>{{greeting}} world {{count}}</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(strip`<p>goodbye world </p>`);

        this.runTask(() => set(customContext, 'greeting', 'sayonara'));

        this.assertHTML(strip`<p>sayonara world </p>`);
      }

      ['@test it can set arguments on the component instance']() {
        this.registerCustomComponentManager({
          create({ ComponentClass, args }) {
            return ComponentClass.create({ args });
          },
        });

        let ComponentClass = CustomComponent.extend({
          salutation: computed('args.firstName', 'args.lastName', function() {
            return this.get('args.firstName') + ' ' + this.get('args.lastName');
          }),
        });

        this.registerComponent('foo-bar', {
          template: `<p>{{salutation}}</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar firstName="Yehuda" lastName="Katz"}}');

        this.assertHTML(strip`<p>Yehuda Katz</p>`);
      }

      ['@test arguments are updated if they change']() {
        this.registerCustomComponentManager({
          create({ ComponentClass, args }) {
            return ComponentClass.create({ args });
          },

          update(component, args) {
            set(component, 'args', args);
          },
        });

        let ComponentClass = CustomComponent.extend({
          salutation: computed('args.firstName', 'args.lastName', function() {
            return this.get('args.firstName') + ' ' + this.get('args.lastName');
          }),
        });

        this.registerComponent('foo-bar', {
          template: `<p>{{salutation}}</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar firstName=firstName lastName=lastName}}', {
          firstName: 'Yehuda',
          lastName: 'Katz',
        });

        this.assertHTML(strip`<p>Yehuda Katz</p>`);

        this.runTask(() =>
          setProperties(this.context, {
            firstName: 'Chad',
            lastName: 'Hietala',
          })
        );

        this.assertHTML(strip`<p>Chad Hietala</p>`);
      }

      [`@test custom components appear in parent view's childViews array`](assert) {
        this.registerCustomComponentManager();

        let ComponentClass = CustomComponent.extend({
          isCustomComponent: true,
        });

        this.registerComponent('turbo-component', {
          template: `<p>turbo</p>`,
          ComponentClass,
        });

        this.registerComponent('curly-component', {
          template: `<div>curly</div>`,
          ComponentClass: Component.extend({
            isClassicComponent: true,
          }),
        });

        this.render('{{#if showTurbo}}{{turbo-component}}{{/if}} {{curly-component}}', {
          showTurbo: true,
        });

        let { childViews } = this.context;

        assert.equal(childViews.length, 2, 'root component has two child views');
        assert.ok(childViews[0].isCustomComponent, 'first child view is custom component');
        assert.ok(childViews[1].isClassicComponent, 'second child view is classic component');

        this.runTask(() => set(this.context, 'showTurbo', false));

        // childViews array is not live and must be re-fetched after changes
        childViews = this.context.childViews;

        assert.equal(
          childViews.length,
          1,
          "turbo component is removed from parent's child views array"
        );
        assert.ok(childViews[0].isClassicComponent, 'first child view is classic component');

        this.runTask(() => set(this.context, 'showTurbo', true));

        childViews = this.context.childViews;
        assert.equal(childViews.length, 2, 'root component has two child views');
        assert.ok(childViews[0].isClassicComponent, 'first child view is classic component');
        assert.ok(childViews[1].isCustomComponent, 'second child view is custom component');
      }

      ['@test can invoke classic components in custom components'](assert) {
        this.registerCustomComponentManager();

        let ComponentClass = CustomComponent.extend({
          isCustomComponent: true,
        });

        this.registerComponent('turbo-component', {
          template: `<p>turbo</p>{{curly-component}}`,
          ComponentClass,
        });

        let classicComponent;

        this.registerComponent('curly-component', {
          template: `<div>curly</div>`,
          ComponentClass: Component.extend({
            init() {
              this._super(...arguments);
              classicComponent = this;
            },

            isClassicComponent: true,
          }),
        });

        this.render('{{turbo-component}}');

        this.assertElement(this.firstChild, {
          tagName: 'P',
          content: 'turbo',
        });

        this.assertComponentElement(this.firstChild.nextSibling, {
          tagName: 'DIV',
          content: '<div>curly</div>',
        });

        let { childViews } = this.context;

        assert.equal(childViews.length, 1, 'root component has one child view');
        assert.ok(childViews[0].isCustomComponent, 'root child view is custom component');

        let customComponent = childViews[0];

        assert.strictEqual(
          customComponent.childViews,
          undefined,
          'custom component does not have childViews property'
        );

        childViews = getChildViews(customComponent);
        assert.equal(childViews.length, 1, 'custom component has one child view');
        assert.ok(
          childViews[0].isClassicComponent,
          'custom component child view is classic component'
        );

        assert.ok(
          classicComponent.parentView.isCustomComponent,
          `classic component's parentView is custom component`
        );
      }
    }
  );
}
