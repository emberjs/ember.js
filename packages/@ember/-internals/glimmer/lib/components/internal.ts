import type { InternalOwner } from '@ember/-internals/owner';
import { setOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import type {
  CapturedArguments,
  Destroyable,
  DynamicScope,
  Environment,
  InternalComponentCapabilities,
  InternalComponentManager,
  TemplateFactory,
  VMArguments,
  WithCreateInstance,
} from '@glimmer/interfaces';
import { setComponentTemplate, setInternalComponentManager } from '@glimmer/manager';
import type { Reference } from '@glimmer/reference';
import { createConstRef, isConstRef, valueForRef } from '@glimmer/reference';
import { untrack } from '@glimmer/validator';

function NOOP(): void {}

export type EventListener = (event: Event) => void;

export default class InternalComponent {
  // Override this
  static toString(): string {
    return 'internal component';
  }

  constructor(
    protected owner: InternalOwner,
    protected readonly args: CapturedArguments,
    protected readonly caller: unknown
  ) {
    setOwner(this, owner);
  }

  /**
   * The default HTML id attribute. We don't really _need_ one, this is just
   * added for compatibility as it's hard to tell if people rely on it being
   * present, and it doens't really hurt.
   *
   * However, don't rely on this internally, like passing it to `getElementId`.
   * This can be (and often is) overriden by passing an `id` attribute on the
   * invocation, which shadows this default id via `...attributes`.
   */
  get id(): string {
    return guidFor(this);
  }

  /**
   * The default HTML class attribute. Similar to the above, we don't _need_
   * them, they are just added for compatibility as it's similarly hard to tell
   * if people rely on it in their CSS etc, and it doens't really hurt.
   */
  get class(): string {
    return 'ember-view';
  }

  protected validateArguments(): void {
    for (let name of Object.keys(this.args.named)) {
      if (!this.isSupportedArgument(name)) {
        this.onUnsupportedArgument(name);
      }
    }
  }

  protected named(name: string): unknown {
    let ref = this.args.named[name];
    return ref ? valueForRef(ref) : undefined;
  }

  protected positional(index: number): unknown {
    let ref = this.args.positional[index];
    return ref ? valueForRef(ref) : undefined;
  }

  protected listenerFor(name: string): EventListener {
    let listener = this.named(name);

    if (listener) {
      assert(
        `The \`@${name}\` argument to the <${this.constructor}> component must be a function`,
        typeof listener === 'function'
      );

      return listener as EventListener;
    } else {
      return NOOP;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected isSupportedArgument(_name: string): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onUnsupportedArgument(_name: string): void {}

  toString(): string {
    return `<${this.constructor}:${guidFor(this)}>`;
  }
}

export interface InternalComponentConstructor<T extends InternalComponent = InternalComponent> {
  new (owner: InternalOwner, args: CapturedArguments, caller: unknown): T;
  prototype: T;
  toString(): string;
}

declare const OPAQUE_INTERNAL_COMPONENT_CONSTRUCTOR: unique symbol;

export interface OpaqueInternalComponentConstructor {
  create(): never;
  toString(): string;
  [OPAQUE_INTERNAL_COMPONENT_CONSTRUCTOR]: true;
}

const OPAQUE_CONSTRUCTOR_MAP = new WeakMap<
  OpaqueInternalComponentConstructor,
  InternalComponentConstructor
>();

export function opaquify(
  constructor: InternalComponentConstructor,
  template: TemplateFactory
): OpaqueInternalComponentConstructor {
  let _opaque: Omit<
    OpaqueInternalComponentConstructor,
    typeof OPAQUE_INTERNAL_COMPONENT_CONSTRUCTOR
  > = {
    // Factory interface
    create(): never {
      throw assert('Use constructor instead of create');
    },

    toString() {
      return constructor.toString();
    },
  };

  let opaque = _opaque as OpaqueInternalComponentConstructor;

  OPAQUE_CONSTRUCTOR_MAP.set(opaque, constructor);

  setInternalComponentManager(INTERNAL_COMPONENT_MANAGER, opaque);
  setComponentTemplate(template, opaque);

  return opaque;
}

function deopaquify(opaque: OpaqueInternalComponentConstructor): InternalComponentConstructor {
  let constructor = OPAQUE_CONSTRUCTOR_MAP.get(opaque);
  assert(`[BUG] Invalid internal component constructor: ${opaque}`, constructor);
  return constructor;
}

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  createCaller: true,
  dynamicScope: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};

class InternalManager
  implements
    InternalComponentManager<InternalComponent, OpaqueInternalComponentConstructor>,
    WithCreateInstance
{
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    owner: InternalOwner,
    definition: OpaqueInternalComponentConstructor,
    args: VMArguments,
    _env: Environment,
    _dynamicScope: DynamicScope,
    caller: Reference
  ): InternalComponent {
    assert('caller must be const', isConstRef(caller));

    let ComponentClass = deopaquify(definition);

    let instance = new ComponentClass(owner, args.capture(), valueForRef(caller));

    untrack(instance['validateArguments'].bind(instance));

    return instance;
  }

  didCreate(): void {}
  didUpdate(): void {}

  didRenderLayout(): void {}
  didUpdateLayout(): void {}

  getDebugName(definition: OpaqueInternalComponentConstructor): string {
    return definition.toString();
  }

  getSelf(instance: InternalComponent): Reference {
    return createConstRef(instance, 'this');
  }

  getDestroyable(instance: InternalComponent): Destroyable {
    return instance;
  }
}

const INTERNAL_COMPONENT_MANAGER = new InternalManager();
