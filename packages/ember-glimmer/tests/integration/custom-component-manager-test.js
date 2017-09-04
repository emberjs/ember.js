import {
  set
} from 'ember-metal';
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
    create(env, definition, args, dynamicScope, caller, hasBlock) {
      return definition.ComponentClass.create();
    }

    getSelf(bucket) { return bucket; }

    // this method is optional
    layoutFor(definition, bucket, env) {
      return env.getCompiledBlock(TestLayoutCompiler, definition.template);
    }

    update(component, dynamicScope) { }
  }

  moduleFor('Components test: curly components with custom manager', class extends RenderingTest {
    ['@test falls back to curly component layout manager'](assert) {
      let managerId = 'test';
      let testManager = new TestComponentManager();
      testManager.layoutFor = undefined;
      this.owner.register(`component-manager:${managerId}`, testManager);
      this.registerComponent('foo-bar', {
        template: `{{use-component-manager "${managerId}"}}hello`,
        managerId
      });

      this.render('{{foo-bar}}');

      assert.equal(this.firstChild.textContent, 'hello', 'content was set correctly');
    }

    ['@test throws an exception if custom component manager does not define `create` method'](assert) {
      let managerId = 'test';
      this.owner.register(`component-manager:${managerId}`, {
        getSelf(bucket) { return bucket; },
        update(component, dynamicScope) { }
      });
      this.registerComponent('foo-bar', {
        template: `{{use-component-manager "${managerId}"}}hello`,
        managerId
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /You must implement `create` method./);
    }

    ['@test throws an exception if custom component manager does not define `getSelf` method'](assert) {
      let managerId = 'test';
      this.owner.register(`component-manager:${managerId}`, {
        create(env, definition, args, dynamicScope, caller, hasBlock) {
          return definition.ComponentClass.create();
        },
        update(component, dynamicScope) { }
      });
      this.registerComponent('foo-bar', {
        template: `{{use-component-manager "${managerId}"}}hello`,
        managerId
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /You must implement `getSelf` method./);
    }

    ['@test throws an exception if custom component manager does not define `update` method'](assert) {
      let managerId = 'test';
      this.owner.register(`component-manager:${managerId}`, {
        create(env, definition, args, dynamicScope, caller, hasBlock) {
          return definition.ComponentClass.create();
        },
        getSelf(bucket) { return bucket; }
      });

      expectAssertion(() => {
        this.registerComponent('foo-bar', {
          template: `{{use-component-manager "${managerId}"}}hello`,
          managerId
        });
        this.render('{{foo-bar class=something}}', {
          something: 'hello'
        });

        this.runTask(() => set(this.context, 'something', 'world'));
      }, /You must implement `update` method./);
    }

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
