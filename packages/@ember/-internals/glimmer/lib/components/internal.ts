import { Owner, setOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { jQuery, jQueryDisabled } from '@ember/-internals/views';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { assert, deprecate } from '@ember/debug';
import { JQUERY_INTEGRATION } from '@ember/deprecated-features';
import {
  CapturedArguments,
  Destroyable,
  DynamicScope,
  Environment,
  InternalComponentCapabilities,
  InternalComponentManager,
  Maybe,
  Option,
  TemplateFactory,
  VMArguments,
  WithCreateInstance,
} from '@glimmer/interfaces';
import {
  setComponentTemplate,
  setInternalComponentManager,
  setInternalModifierManager,
} from '@glimmer/manager';
import { createConstRef, isConstRef, Reference, valueForRef } from '@glimmer/reference';
import { untrack } from '@glimmer/validator';
import InternalModifier, { InternalModifierManager } from '../modifiers/internal';

function NOOP(): void {}

// TODO: remove me when IE11 support is EOL
export let ObjectEntries = ((): typeof Object['entries'] => {
  if (typeof Object.entries === 'function') {
    return Object.entries;
  } else {
    return (obj: {}) => Object.keys(obj).map((key) => [key, obj[key]] as [string, unknown]);
  }
})();

// TODO: remove me when IE11 support is EOL
export let ObjectValues = ((): typeof Object['values'] => {
  if (typeof Object.values === 'function') {
    return Object.values;
  } else {
    return (obj: {}) => Object.keys(obj).map((key) => obj[key]);
  }
})();

export type EventListener = (event: Event) => void;

export default class InternalComponent {
  // Override this
  static toString(): string {
    return 'internal component';
  }

  constructor(
    protected owner: Owner,
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
  new (owner: Owner, args: CapturedArguments, caller: unknown): T;
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
    WithCreateInstance {
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    owner: Owner,
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

// Deprecated features

export interface DeprecatingInternalComponent extends InternalComponent {
  modernized: boolean;
}

export type DeprecatingInternalComponentConstructor = InternalComponentConstructor<
  DeprecatingInternalComponent
>;

export function handleDeprecatedArguments(target: DeprecatingInternalComponentConstructor): void {
  if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
    let angle = target.toString();
    let { prototype } = target;

    let superOnUnsupportedArgument = prototype['onUnsupportedArgument'];

    Object.defineProperty(prototype, 'onUnsupportedArgument', {
      configurable: true,
      enumerable: false,
      value: function onUnsupportedArgument(
        this: DeprecatingInternalComponent,
        name: string
      ): void {
        deprecate(`Passing the \`@${name}\` argument to <${angle}> is deprecated.`, false, {
          id: 'ember.built-in-components.legacy-arguments',
          for: 'ember-source',
          since: {
            enabled: '3.27.0',
          },
          until: '4.0.0',
          url:
            'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-arguments',
        });

        this.modernized = false;

        superOnUnsupportedArgument.call(this, name);
      },
    });
  }
}

export function handleDeprecatedAttributeArguments(
  target: DeprecatingInternalComponentConstructor,
  bindings: Array<string | [attribute: string, argument: string]>
): void {
  if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
    let angle = target.toString();
    let curly = angle.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    let { prototype } = target;

    let descriptorFor = (target: object, property: string): Option<PropertyDescriptor> => {
      if (target) {
        return (
          Object.getOwnPropertyDescriptor(target, property) ||
          descriptorFor(Object.getPrototypeOf(target), property)
        );
      } else {
        return null;
      }
    };

    bindings.forEach((binding) => {
      let attribute: string;
      let argument: string;

      if (Array.isArray(binding)) {
        [attribute, argument] = binding;
      } else {
        attribute = argument = binding;
      }

      let superIsSupportedArgument = prototype['isSupportedArgument'];

      Object.defineProperty(prototype, 'isSupportedArgument', {
        configurable: true,
        enumerable: false,
        value: function isSupportedArgument(
          this: DeprecatingInternalComponent,
          name: string
        ): boolean {
          return (
            (this.modernized && name === argument) || superIsSupportedArgument.call(this, name)
          );
        },
      });

      let superDescriptor = descriptorFor(prototype, attribute);
      let superGetter: (this: DeprecatingInternalComponent) => unknown = () => undefined;

      if (superDescriptor) {
        assert(
          `[BUG] expecting ${attribute} to be a getter on <${angle}>`,
          typeof superDescriptor.get === 'function'
        );

        superGetter = superDescriptor.get;
      }

      Object.defineProperty(prototype, attribute, {
        configurable: true,
        enumerable: true,
        get(this: DeprecatingInternalComponent): unknown {
          if (argument in this.args.named) {
            deprecate(
              `Passing the \`@${argument}\` argument to <${angle}> is deprecated. ` +
                `Instead, please pass the attribute directly, i.e. \`<${angle} ${attribute}={{...}} />\` ` +
                `instead of \`<${angle} @${argument}={{...}} />\` or \`{{${curly} ${argument}=...}}\`.`,
              false,
              {
                id: 'ember.built-in-components.legacy-attribute-arguments',
                for: 'ember-source',
                since: {
                  enabled: '3.27.0',
                },
                until: '4.0.0',
                url:
                  'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-attribute-arguments',
              }
            );

            // The `class` attribute is concatenated/merged instead of clobbered
            if (attribute === 'class' && superDescriptor) {
              return `${superGetter.call(this)} ${this.named(argument)}`;
            } else {
              return this.named(argument);
            }
          } else {
            return superGetter.call(this);
          }
        },
      });
    });
  }
}

export let handleDeprecatedEventArguments: (
  target: DeprecatingInternalComponentConstructor,
  extraEvents?: Array<[event: string, argument: string]>
) => void = NOOP;

if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
  type EventsMap = Record<string, string>;

  const EVENTS = new WeakMap<object, EventsMap>();

  const EMPTY_EVENTS = Object.freeze({}) as EventsMap;

  const getEventsMap = (owner: Owner): EventsMap => {
    let events = EVENTS.get(owner);

    if (events === undefined) {
      events = EMPTY_EVENTS;

      let eventDispatcher = owner.lookup<Maybe<{ _finalEvents?: EventsMap }>>(
        'event_dispatcher:main'
      );

      if (eventDispatcher !== null && eventDispatcher !== undefined) {
        assert('[BUG] invalid event dispatcher', typeof eventDispatcher === 'object');

        if (
          '_finalEvents' in eventDispatcher &&
          eventDispatcher._finalEvents !== null &&
          eventDispatcher._finalEvents !== undefined
        ) {
          assert(
            '[BUG] invalid _finalEvents on event dispatcher',
            typeof eventDispatcher._finalEvents === 'object'
          );

          events = eventDispatcher._finalEvents;
        }
      }

      EVENTS.set(owner, events);
    }

    return events;
  };

  handleDeprecatedEventArguments = (target, extraEvents = []) => {
    let angle = target.toString();
    let curly = angle.toLowerCase();
    let { prototype } = target;

    let superIsSupportedArgument = prototype['isSupportedArgument'];

    Object.defineProperty(prototype, 'isSupportedArgument', {
      configurable: true,
      enumerable: false,
      value: function isSupportedArgument(
        this: DeprecatingInternalComponent,
        name: string
      ): boolean {
        let events = [
          ...ObjectValues(getEventsMap(this.owner)),
          'focus-in',
          'focus-out',
          'key-press',
          'key-up',
          'key-down',
        ];

        return (
          (this.modernized && events.indexOf(name) !== -1) ||
          superIsSupportedArgument.call(this, name)
        );
      },
    });

    class DeprecatedEventHandlersModifier extends InternalModifier {
      static toString(): string {
        return 'DeprecatedEventHandlersModifier';
      }

      private listeners = new Map<string, EventListener>();

      install(): void {
        let { element, component, listenerFor, listeners } = this;

        let entries: [event: string, argument: string][] = [
          ...ObjectEntries(getEventsMap(this.owner)),
          ...extraEvents,
        ];

        for (let [event, argument] of entries) {
          let listener = listenerFor.call(component, event, argument);

          if (listener) {
            listeners.set(event, listener);
            element.addEventListener(event, listener);
          }
        }

        Object.freeze(listeners);
      }

      remove(): void {
        let { element, listeners } = this;

        for (let [event, listener] of ObjectEntries(listeners)) {
          element.removeEventListener(event, listener);
        }

        this.listeners = new Map();
      }

      private get component(): DeprecatingInternalComponent {
        let component = this.positional(0);

        assert(
          `[BUG] must pass <${angle}> component as first argument`,
          component instanceof target
        );

        return component;
      }

      private listenerFor(
        this: DeprecatingInternalComponent,
        event: string,
        argument: string
      ): Option<EventListener> {
        assert(`[BUG] must be called with <${angle}> component as this`, this instanceof target);

        if (argument in this.args.named) {
          deprecate(
            `Passing the \`@${argument}\` argument to <${angle}> is deprecated. ` +
              `This would have overwritten the internal \`${argument}\` method on ` +
              `the <${angle}> component and prevented it from functioning properly. ` +
              `Instead, please use the {{on}} modifier, i.e. \`<${angle} {{on "${event}" ...}} />\` ` +
              `instead of \`<${angle} @${argument}={{...}} />\` or \`{{${curly} ${argument}=...}}\`.`,
            !(argument in this),
            {
              id: 'ember.built-in-components.legacy-attribute-arguments',
              for: 'ember-source',
              since: {
                enabled: '3.27.0',
              },
              until: '4.0.0',
              url:
                'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-attribute-arguments',
            }
          );

          deprecate(
            `Passing the \`@${argument}\` argument to <${angle}> is deprecated. ` +
              `Instead, please use the {{on}} modifier, i.e. \`<${angle} {{on "${event}" ...}} />\` ` +
              `instead of \`<${angle} @${argument}={{...}} />\` or \`{{${curly} ${argument}=...}}\`.`,
            argument in this,
            {
              id: 'ember.built-in-components.legacy-attribute-arguments',
              for: 'ember-source',
              since: {
                enabled: '3.27.0',
              },
              until: '4.0.0',
              url:
                'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-attribute-arguments',
            }
          );

          return this['listenerFor'].call(this, argument);
        } else {
          return null;
        }
      }
    }

    setInternalModifierManager(
      new InternalModifierManager(DeprecatedEventHandlersModifier, 'deprecated-event-handlers'),
      DeprecatedEventHandlersModifier
    );

    Object.defineProperty(prototype, 'handleDeprecatedEvents', {
      configurable: true,
      enumerable: true,
      value: DeprecatedEventHandlersModifier,
    });
  };
}

export function jQueryEventShim(target: DeprecatingInternalComponentConstructor): void {
  if (JQUERY_INTEGRATION) {
    let { prototype } = target;

    let superListenerFor = prototype['listenerFor'];

    Object.defineProperty(prototype, 'listenerFor', {
      configurable: true,
      enumerable: false,
      value: function listenerFor(this: InternalComponent, name: string): EventListener {
        let listener = superListenerFor.call(this, name);

        if (jQuery && !jQueryDisabled) {
          return (event: Event) => listener(new jQuery.Event(event));
        } else {
          return listener;
        }
      },
    });
  }
}
