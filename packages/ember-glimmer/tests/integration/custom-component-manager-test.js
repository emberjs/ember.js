import {
  compileLayout,
  PrimitiveReference
} from '@glimmer/runtime';
import { moduleFor, RenderingTest } from '../utils/test-case';
import {
  EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER,
  GLIMMER_CUSTOM_COMPONENT_MANAGER,
  MANDATORY_SETTER
} from 'ember/features';

import ExperimentalComponentManager from 'ember-glimmer/component-managers/curly'

if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
  /*
    Custom layout compiler. Exists mostly to inject
    class and attributes for testing purposes.
  */
  class TestLayoutCompiler {
    constructor(template) {
      this.template = template;
    }

    compile(builder) {
      builder.wrapLayout(this.template);
      builder.tag.dynamic(() => {
        return PrimitiveReference.create('p');
      });
      builder.attrs.static('class', 'hey-oh-lets-go');
      builder.attrs.static('manager-id', 'test');
    }
  }

  /*
    Implementation of custom component manager, `ComponentManager` interface
  */
  class TestComponentManager {
    prepareArgs(definition, args) { return null; }

    create(env, definition, args, dynamicScope, caller, hasBlock) {
      return definition.ComponentClass.create();
    }

    layoutFor(definition, bucket, env) {
      return env.getCompiledBlock(TestLayoutCompiler, definition.template);
    }

    getSelf({ component }) { return component; }

    didCreateElement(component, element, operations) { }

    didRenderLayout(component, bounds) { }

    didCreate(component) { }

    getTag({ component }) { return null; }

    update(component, dynamicScope) { }

    didUpdateLayout(component, bounds) { }

    didUpdate(component) { }

    getDestructor(component) { }
  }

  moduleFor('Components test: curly components with custom manager', class extends RenderingTest {
    ['@test it can render a basic component with custom component manager'](assert) {
      let managerId = 'test';
      this.owner.register(`component-manager:${managerId}`, new TestComponentManager());
      this.registerComponent('foo-bar', {
        template: `{{use-component-manager "${managerId}"}}hello`,
        managerId
      });

      this.render('{{foo-bar}}');

      assert.equal(this.firstChild.className, 'hey-oh-lets-go', 'class name was set correctly');
      assert.equal(this.firstChild.tagName, 'P', 'tag name was set correctly');
      assert.equal(this.firstChild.getAttribute('manager-id'), managerId, 'custom attribute was set correctly');
    }
  });
}
