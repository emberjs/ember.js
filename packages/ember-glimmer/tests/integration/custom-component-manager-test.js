import { moduleFor, RenderingTest } from '../utils/test-case';
import {
  GLIMMER_CUSTOM_COMPONENT_MANAGER
} from 'ember/features';
import { AbstractComponentManager } from 'ember-glimmer';

if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
  /*
    Implementation of custom component manager, `ComponentManager` interface
  */
  class TestComponentManager extends AbstractComponentManager {
    create(env, definition) {
      return definition.ComponentClass.create();
    }

    getDestructor(component) {
      return component;
    }

    getSelf() {
      return null;
    }
  }

  moduleFor('Components test: curly components with custom manager', class extends RenderingTest {
    ['@skip it can render a basic component with custom component manager'](assert) {
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
