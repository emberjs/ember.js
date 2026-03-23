/**
  @module @ember/helper
*/

import type {
  Bounds,
  CapturedArguments,
  CompilableProgram,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  InternalComponentManager,
  VMArguments,
  WithCreateInstance,
  WithDynamicLayout,
  WithDynamicTagName,
} from '@glimmer/interfaces';
import type { Nullable } from '@ember/-internals/utility-types';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef, NULL_REFERENCE } from '@glimmer/reference';
import { setInternalComponentManager, setComponentTemplate } from '@glimmer/manager';
import { templateFactory } from '@glimmer/opcode-compiler';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { internalHelper } from './internal-helper';

// ============ Void Element Component (for null/undefined) ============
// Renders nothing (no yield, no wrapper element)

const VOID_CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: false,
  createInstance: false,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};

class VoidElementManager implements InternalComponentManager {
  getCapabilities(): InternalComponentCapabilities {
    return VOID_CAPABILITIES;
  }

  getDebugName(): string {
    return '(element null)';
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  getDestroyable(): null {
    return null;
  }
}

const VOID_ELEMENT_MANAGER = new VoidElementManager();

// Empty template that renders nothing and does not yield
const EMPTY_TEMPLATE_FACTORY = templateFactory({
  id: 'element-helper-void',
  moduleName: '__element_void__.hbs',
  block: JSON.stringify([[], [], []]),
  scope: null,
  isStrictMode: true,
});

class VoidElementComponentDefinition {
  toString(): string {
    return '(element null)';
  }
}

setComponentTemplate(EMPTY_TEMPLATE_FACTORY, VoidElementComponentDefinition.prototype);
setInternalComponentManager(VOID_ELEMENT_MANAGER, VoidElementComponentDefinition.prototype);

const VOID_DEFINITION = new VoidElementComponentDefinition();

// ============ Element Component (for string tag names) ============
// Renders content wrapped in the specified HTML element, or just renders
// content without a wrapper for empty string.

const ELEMENT_CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: false,
  createInstance: true,
  wrapped: true,
  willDestroy: false,
  hasSubOwner: false,
};

// The instance state is just the tag name string or null (for empty string)
type ElementInstanceState = string | null;

class ElementComponentManager
  implements
    WithCreateInstance<ElementInstanceState, ElementComponentDefinition>,
    WithDynamicLayout<ElementInstanceState>,
    WithDynamicTagName<ElementInstanceState>
{
  getCapabilities(): InternalComponentCapabilities {
    return ELEMENT_CAPABILITIES;
  }

  getDebugName(state: ElementComponentDefinition): string {
    return `(element "${state.tagName}")`;
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  getDestroyable(): Nullable<Destroyable> {
    return null;
  }

  didCreateElement(): void {
    // no-op: element helper doesn't need to customize the element after creation
  }

  create(
    _owner: object,
    state: ElementComponentDefinition,
    _args: Nullable<VMArguments>,
    _env: Environment,
    _dynamicScope: unknown,
    _caller: Nullable<Reference>,
    _hasDefaultBlock: boolean
  ): ElementInstanceState {
    // For empty string, return null so getTagName returns null (no wrapper element)
    return state.tagName || null;
  }

  getDynamicLayout(): CompilableProgram | null {
    // Return null to fall back to the VM's defaultTemplate.asWrappedLayout()
    // The default template is {{yield}}, which yields to the block content
    return null;
  }

  getTagName(state: ElementInstanceState): Nullable<string> {
    return state;
  }

  didRenderLayout(_state: ElementInstanceState, _bounds: Bounds): void {
    // no-op
  }

  didUpdateLayout(_state: ElementInstanceState, _bounds: Bounds): void {
    // no-op
  }

  didCreate(_state: ElementInstanceState): void {
    // no-op
  }

  didUpdate(_state: ElementInstanceState): void {
    // no-op
  }
}

const ELEMENT_COMPONENT_MANAGER = new ElementComponentManager();

class ElementComponentDefinition {
  constructor(public tagName: string) {}

  toString(): string {
    return `(element "${this.tagName}")`;
  }
}

setInternalComponentManager(ELEMENT_COMPONENT_MANAGER, ElementComponentDefinition.prototype);

// Cache component definitions per tag name to avoid creating duplicate definitions
const ELEMENT_DEFINITIONS = new Map<string, ElementComponentDefinition>();

function getElementDefinition(tagName: string): ElementComponentDefinition {
  let definition = ELEMENT_DEFINITIONS.get(tagName);
  if (definition === undefined) {
    definition = new ElementComponentDefinition(tagName);
    ELEMENT_DEFINITIONS.set(tagName, definition);
  }
  return definition;
}

// ============ Element Helper ============

/**
  The `element` helper lets you dynamically set the tag name of an element.

  ```handlebars
  {{#let (element @tagName) as |Tag|}}
    <Tag class="my-element">Hello</Tag>
  {{/let}}
  ```

  When `@tagName` is `"h1"`, this renders `<h1 class="my-element">Hello</h1>`.

  When `@tagName` is an empty string `""`, the block content is rendered without
  a wrapping element.

  When `@tagName` is `null` or `undefined`, nothing is rendered.

  Changing the tag name will tear down and recreate the element and its contents.

  @method element
  @for Ember.Templates.helpers
  @public
*/
export default internalHelper(({ positional, named }: CapturedArguments) => {
  return createComputeRef(
    () => {
      if (DEBUG) {
        assert(
          'The `element` helper takes a single positional argument',
          positional.length === 1
        );
        assert(
          'The `element` helper does not take any named arguments',
          Object.keys(named).length === 0
        );
      }

      let tagName = valueForRef(positional[0]!);

      if (tagName === null || tagName === undefined) {
        return VOID_DEFINITION;
      }

      if (DEBUG) {
        assert(
          `The argument passed to the \`element\` helper must be a string${
            typeof tagName === 'object' ? '' : ` (you passed \`${tagName}\`)`
          }`,
          typeof tagName === 'string'
        );
      }

      return getElementDefinition(tagName as string);
    },
    null,
    'element'
  );
});
