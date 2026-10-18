/**
 * The built-in components the compat backend renders itself are known by
 * identity (compat, GXT_MODE).
 *
 * `<LinkTo>` and `<Textarea>` have an internal component manager, as `<Input>`
 * has, and manager.ts builds their elements itself (`handleManagedComponent`).
 * A component class with an internal manager of its own whose `toString()`
 * gives the name of a built-in is no built-in: it renders no link and no
 * textarea.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';
import { setInternalComponentManager } from '@glimmer/manager';
import { NULL_REFERENCE } from '@glimmer/reference';

const CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};

// An internal component manager that creates an empty component.
class EmptyComponentManager {
  getCapabilities() {
    return CAPABILITIES;
  }

  create(): object {
    return {};
  }

  getSelf() {
    return NULL_REFERENCE;
  }

  getDestroyable() {
    return null;
  }

  didCreate() {}
  didUpdate() {}
  didRenderLayout() {}
  didUpdateLayout() {}

  getDebugName() {
    return 'empty';
  }
}

class NamedLikeLinkTo {
  static toString() {
    return 'LinkTo';
  }
}
setInternalComponentManager(new EmptyComponentManager() as any, NamedLikeLinkTo);

class NamedLikeTextarea {
  static toString() {
    return 'Textarea';
  }
}
setInternalComponentManager(new EmptyComponentManager() as any, NamedLikeTextarea);

moduleFor(
  'GXT built-in components: known by identity',
  class extends RenderingTestCase {
    ['@test a component class named like LinkTo does not render as a link']() {
      this.owner.register('component:named-like-link-to', NamedLikeLinkTo);

      this.render('<NamedLikeLinkTo />');

      this.assert.strictEqual(this.element.querySelector('a'), null, 'no link');
    }

    ['@test a component class named like Textarea does not render as a textarea']() {
      this.owner.register('component:named-like-textarea', NamedLikeTextarea);

      this.render('<NamedLikeTextarea />');

      this.assert.strictEqual(this.element.querySelector('textarea'), null, 'no textarea');
    }

    ['@test <Textarea> renders as a textarea']() {
      this.render('<Textarea @value={{this.value}} />', { value: 'text' });

      this.assert.strictEqual(this.element.querySelector('textarea')?.value, 'text');
    }
  }
);
