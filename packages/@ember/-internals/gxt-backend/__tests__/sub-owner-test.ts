/**
 * A component whose internal component manager has the `hasSubOwner`
 * capability, rendered through `renderComponent` (compat, GXT_MODE).
 *
 * Glimmer semantics (runtime opcodes component.ts, VIRTUAL_ROOT_SCOPE): a
 * component invoked dynamically (the root of a `renderComponent` call is) is
 * created by its manager with the caller's owner, and when the manager has
 * `hasSubOwner`, everything its template renders sees
 * `manager.getOwner(state)` as its owner: the components it renders are
 * created with that owner, and components, helpers and services are looked up
 * in it. Destroying the render destroys the manager's destroyable.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { AbstractStrictTestCase, assertHTML, buildOwner, moduleFor } from 'internal-test-helpers';
import { capabilities as helperCapabilities, setHelperManager } from '@ember/helper';
import type Owner from '@ember/owner';
import { getOwner } from '@ember/owner';
import { renderComponent, renderSettled } from '@ember/renderer';
import Service from '@ember/service';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate, setInternalComponentManager } from '@glimmer/manager';
import { NULL_REFERENCE } from '@glimmer/reference';
import { associateDestroyableChild, destroy, registerDestructor } from '@glimmer/destroyable';
import GlimmerComponent from '@glimmer/component';

const SUB_OWNER_CAPABILITIES = {
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
  hasSubOwner: true,
};

interface SubOwnerState {
  owner: Owner;
  destroyable: object;
}

// An internal component manager whose component renders with the owner its
// definition names (the way `{{mount}}` renders an engine).
class SubOwnerManager {
  createdWith: unknown[] = [];

  getCapabilities() {
    return SUB_OWNER_CAPABILITIES;
  }

  create(owner: Owner, definition: { subOwner: Owner; destroyable: object }): SubOwnerState {
    this.createdWith.push(owner);
    return { owner: definition.subOwner, destroyable: definition.destroyable };
  }

  getOwner(state: SubOwnerState) {
    return state.owner;
  }

  getSelf() {
    return NULL_REFERENCE;
  }

  getDestroyable(state: SubOwnerState) {
    return state.destroyable;
  }

  didCreate() {}
  didUpdate() {}
  didRenderLayout() {}
  didUpdateLayout() {}

  getDebugName() {
    return 'sub-owner';
  }
}

class SubOwnerComponent {
  static subOwner: Owner;
  static destroyable: object;
}

const SUB_OWNER_MANAGER = new SubOwnerManager();
setInternalComponentManager(SUB_OWNER_MANAGER as any, SubOwnerComponent);

function defineUserHelper(fn: () => unknown): object {
  return setHelperManager(
    () => ({
      capabilities: helperCapabilities('3.23', { hasValue: true }),
      createHelper: () => ({ fn }),
      getValue: (bucket: { fn: () => unknown }) => bucket.fn(),
    }),
    {}
  );
}

class NameService extends Service {
  declare value: string;
}

moduleFor(
  "GXT renderComponent: a hasSubOwner component manager's owner",
  class extends AbstractStrictTestCase {
    owner: Owner;
    subOwner: Owner;

    constructor(assert: QUnit['assert']) {
      super(assert);
      this.owner = buildOwner({});
      this.subOwner = buildOwner({});
      associateDestroyableChild(this, this.owner);
      associateDestroyableChild(this, this.subOwner);
      SUB_OWNER_MANAGER.createdWith.length = 0;
    }

    get element(): Element {
      return document.querySelector('#qunit-fixture')!;
    }

    async afterEach() {
      destroy(this);
      await renderSettled();
    }

    // The same names in both owners, with values that tell them apart.
    registerInBothOwners(): void {
      for (const [owner, label] of [
        [this.owner, 'root'],
        [this.subOwner, 'sub'],
      ] as const) {
        owner.register(
          'service:name',
          class extends NameService {
            value = label;
          }
        );
        owner.register(
          `helper:where`,
          defineUserHelper(() => label),
          { instantiate: false }
        );
        owner.register(
          'component:child',
          setComponentTemplate(
            precompileTemplate(`<${label}>{{this.name}}</${label}>`),
            class extends GlimmerComponent {
              get name() {
                return (getOwner(this)!.lookup('service:name') as NameService).value;
              }
            }
          )
        );
      }
    }

    defineMount(template: object, destroyable: object = {}): typeof SubOwnerComponent {
      const subOwner = this.subOwner;
      const Mount = class extends SubOwnerComponent {
        static override subOwner = subOwner;
        static override destroyable = destroyable;
      };
      setComponentTemplate(template as any, Mount);
      return Mount;
    }

    async '@test the components, helpers and services it renders come from the owner the manager returns'(
      assert: QUnit['assert']
    ) {
      this.registerInBothOwners();
      const Mount = this.defineMount(precompileTemplate('[{{where}}]<Child />'));

      const result = renderComponent(Mount, { owner: this.owner, into: this.element });
      registerDestructor(this, () => result.destroy());
      await renderSettled();

      assertHTML('[sub]<sub>sub</sub>');
      assert.deepEqual(
        SUB_OWNER_MANAGER.createdWith,
        [this.owner],
        "the manager creates the component with the caller's owner"
      );
    }

    async '@test a Glimmer component it renders is created with the owner the manager returns'(
      assert: QUnit['assert']
    ) {
      const owners: unknown[] = [];
      const Check = class extends GlimmerComponent {
        constructor(owner: Owner, args: object) {
          super(owner, args);
          owners.push(owner);
        }
      };
      setComponentTemplate(precompileTemplate('checked'), Check);
      const Mount = this.defineMount(
        precompileTemplate('<Check />', { strictMode: true, scope: () => ({ Check }) })
      );

      const result = renderComponent(Mount, { owner: this.owner, into: this.element });
      registerDestructor(this, () => result.destroy());
      await renderSettled();

      assertHTML('checked');
      assert.strictEqual(owners.length, 1, 'one component');
      assert.strictEqual(owners[0], this.subOwner, 'created with the sub-owner');
    }

    async '@test destroying the render destroys the manager destroyable'(assert: QUnit['assert']) {
      const destroyable = {};
      let destroyed = 0;
      registerDestructor(destroyable, () => destroyed++);
      const Mount = this.defineMount(precompileTemplate('mounted'), destroyable);

      const result = renderComponent(Mount, { owner: this.owner, into: this.element });
      await renderSettled();
      assertHTML('mounted');
      assert.strictEqual(destroyed, 0, 'alive while rendered');

      result.destroy();
      await renderSettled();
      assertHTML('');
      assert.strictEqual(destroyed, 1, 'destroyed with the render');
    }
  }
);
