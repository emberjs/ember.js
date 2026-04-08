/**
  @module @ember/helper
*/

import type { CapturedArguments, InternalComponentManager } from '@glimmer/interfaces';
import { createComputeRef, valueForRef, NULL_REFERENCE } from '@glimmer/reference';
import { setInternalComponentManager } from '@glimmer/manager';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { internalHelper } from './internal-helper';

// ============ Element Component (for string tag names) ============
// Renders content wrapped in the specified HTML element, or just renders
// content without a wrapper for empty string.

const ELEMENT_CAPABILITIES = {
  createInstance: true,
  wrapped: true,
};

class ElementComponentManager {
  getCapabilities() {
    return ELEMENT_CAPABILITIES;
  }

  getDebugName(state: ElementComponentDefinition) {
    return `(element "${state.tagName}")`;
  }

  getSelf() {
    return NULL_REFERENCE;
  }

  getDestroyable() {
    return null;
  }

  didCreateElement() {}

  create(_owner: object, state: ElementComponentDefinition) {
    // For empty string, return null so getTagName returns null (no wrapper element)
    return state.tagName || null;
  }

  getTagName(state: string | null) {
    return state;
  }

  didRenderLayout() {}
  didUpdateLayout() {}
  didCreate() {}
  didUpdate() {}
}

const ELEMENT_COMPONENT_MANAGER = new ElementComponentManager();

class ElementComponentDefinition {
  constructor(public tagName: string) {}

  toString(): string {
    return `(element "${this.tagName}")`;
  }
}

setInternalComponentManager(
  ELEMENT_COMPONENT_MANAGER as unknown as InternalComponentManager,
  ElementComponentDefinition.prototype
);

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

  Passing `null`, `undefined`, or non-string values will throw an assertion error.

  Changing the tag name will tear down and recreate the element and its contents.

  @method element
  @for Ember.Templates.helpers
  @public
*/
export default internalHelper(({ positional, named }: CapturedArguments) => {
  return createComputeRef(
    () => {
      if (DEBUG) {
        assert('The `element` helper takes a single positional argument', positional.length === 1);
        assert(
          'The `element` helper does not take any named arguments',
          Object.keys(named).length === 0
        );
      }

      let tagName = valueForRef(positional[0]!);

      if (DEBUG) {
        assert(
          `The argument passed to the \`element\` helper must be a string${
            tagName === null || tagName === undefined || typeof tagName === 'object'
              ? ''
              : ` (you passed \`${tagName}\`)`
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
