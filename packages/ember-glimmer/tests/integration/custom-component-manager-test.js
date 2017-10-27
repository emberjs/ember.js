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
import { AbstractComponentManager } from 'ember-glimmer';

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
  class TestComponentManager extends AbstractComponentManager {
    create(env, definition, args, dynamicScope, caller, hasBlock) {
      return definition.ComponentClass.create();
    }

    layoutFor(definition, bucket, env) {
      return env.getCompiledBlock(TestLayoutCompiler, definition.template);
    }

    getDestructor(component) {
      return component;
    }

    getSelf() {
      return null;
    }
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
