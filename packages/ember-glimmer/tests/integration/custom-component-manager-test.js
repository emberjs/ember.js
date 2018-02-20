import { moduleFor, RenderingTest } from '../utils/test-case';
import { Component, COMPONENT_MANAGER } from '../utils/helpers';

import {
  GLIMMER_CUSTOM_COMPONENT_MANAGER
} from 'ember/features';
import { AbstractComponentManager, RootReference } from 'ember-glimmer';

if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
  /*
    Implementation of custom component manager, `ComponentManager` interface
  */
  class ComponentStateBucket {
    constructor(component, args) {
      this.component = component;
      this.args = args;
    }

    destroy() {
    }
  }

  class TestComponentManager extends AbstractComponentManager {
    static create() {
      return new this();
    }

    getTag({ args }) {
      return args.tag;
    }

    create(env, state, args) {
      let capturedArgs = args.named.capture();
      let factory = state.ComponentClass;
      let component = factory.create();

      let bucket = new ComponentStateBucket(component, capturedArgs);
      return bucket;
    }

    getLayout(state) {
      return {
        handle: state.template.asLayout().compile(),
        symbolTable: state.symbolTable
      };
    }

    getCapabilities() {
      return {
        dynamicLayout: false,
        dynamicTag: false,
        prepareArgs: false,
        createArgs: true,
        attributeHook: false,
        elementHook: false
      };
    }

    getDestructor(bucket) {
      return bucket;
    }

    getSelf({ component }) {
      return new RootReference(component);
    }
  }

  moduleFor('Components test: curly components with custom manager', class extends RenderingTest {
    ['@test it can render a basic component with custom component manager'](assert) {
      let managerId = 'test-manager';

      let ComponentClass = Component.extend({}).reopenClass({
        [COMPONENT_MANAGER]: managerId
      });

      this.owner.register(`component-manager:${managerId}`, TestComponentManager, { singleton: true });
      this.registerComponent('foo-bar', {
        template: `<p>hello world</p>`,
        ComponentClass
      });

      this.render('{{foo-bar}}');

      assert.equal(this.firstChild.tagName, 'P', 'tag name was set correctly');
    }
  });
}
