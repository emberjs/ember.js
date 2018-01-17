import { CONSTANT_TAG } from '@glimmer/reference';
import { PrimitiveReference } from '@glimmer/runtime';
import { moduleFor, RenderingTest } from '../utils/test-case';
import {
  GLIMMER_CUSTOM_COMPONENT_MANAGER
} from 'ember/features';
import { AbstractComponentManager, ROOT_REF } from 'ember-glimmer';

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

    getSelf(component) {
      return component[ROOT_REF];
    }
    getCapabilities() {
      return {
        dynamicLayout: false
      };
    }
    getLayout(state) {
      return {
        handle: state.handle,
        symbolTable: state.symbolTable
      };
    }
    didCreateElement(bucket, element, operations) {
      operations.setAttribute('class', PrimitiveReference.create('hey-oh-lets-go'));
      operations.setAttribute('manager-id', PrimitiveReference.create('test'));
    }
    // TODO: uncomment this when the cause of the infinite loop is discovered and resolved
    // getTagName() { return 'p'; }
    getTag() {
      return CONSTANT_TAG;
    }
    getDestructor() {
      return { destroy() {} }
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
