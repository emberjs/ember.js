import { get } from '@ember/-internals/metal';
import { assert, deprecate } from '@ember/debug';
import { EMBER_COMPONENT_IS_VISIBLE } from '@ember/deprecated-features';
import { dasherize } from '@ember/string';
import { DEBUG } from '@glimmer/env';
import { ElementOperations } from '@glimmer/interfaces';
import {
  childRefFor,
  childRefFromParts,
  createComputeRef,
  createPrimitiveRef,
  Reference,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference';
import { logTrackingStack } from '@glimmer/validator';
import { Component } from './curly-component-state-bucket';
import { htmlSafe, isHTMLSafe, SafeString } from './string';

function referenceForParts(rootRef: Reference<Component>, parts: string[]): Reference {
  let isAttrs = parts[0] === 'attrs';

  // TODO deprecate this
  if (isAttrs) {
    parts.shift();

    if (parts.length === 1) {
      return childRefFor(rootRef, parts[0]);
    }
  }

  return childRefFromParts(rootRef, parts);
}

export function parseAttributeBinding(microsyntax: string): [string, string, boolean] {
  let colonIndex = microsyntax.indexOf(':');

  if (colonIndex === -1) {
    assert(
      'You cannot use class as an attributeBinding, use classNameBindings instead.',
      microsyntax !== 'class'
    );
    return [microsyntax, microsyntax, true];
  } else {
    let prop = microsyntax.substring(0, colonIndex);
    let attribute = microsyntax.substring(colonIndex + 1);

    assert(
      'You cannot use class as an attributeBinding, use classNameBindings instead.',
      attribute !== 'class'
    );

    return [prop, attribute, false];
  }
}

export function installAttributeBinding(
  component: Component,
  rootRef: Reference<Component>,
  parsed: [string, string, boolean],
  operations: ElementOperations
) {
  let [prop, attribute, isSimple] = parsed;

  if (attribute === 'id') {
    let elementId = get(component, prop);
    if (elementId === undefined || elementId === null) {
      elementId = component.elementId;
    }
    elementId = createPrimitiveRef(elementId);
    operations.setAttribute('id', elementId, true, null);
    return;
  }

  let isPath = prop.indexOf('.') > -1;
  let reference = isPath ? referenceForParts(rootRef, prop.split('.')) : childRefFor(rootRef, prop);

  assert(
    `Illegal attributeBinding: '${prop}' is not a valid attribute name.`,
    !(isSimple && isPath)
  );

  if (EMBER_COMPONENT_IS_VISIBLE && attribute === 'style' && createStyleBindingRef !== undefined) {
    reference = createStyleBindingRef(reference, childRefFor(rootRef, 'isVisible'));
  }

  operations.setAttribute(attribute, reference, false, null);
}

const DISPLAY_NONE = 'display: none;';
const SAFE_DISPLAY_NONE = htmlSafe(DISPLAY_NONE);

let createStyleBindingRef:
  | undefined
  | ((inner: Reference, isVisible: Reference) => Reference<string | SafeString>);

export let installIsVisibleBinding:
  | undefined
  | ((rootRef: Reference<Component>, operations: ElementOperations) => void);

if (EMBER_COMPONENT_IS_VISIBLE) {
  createStyleBindingRef = (inner: Reference, isVisibleRef: Reference) => {
    return createComputeRef(() => {
      let value = valueForRef(inner);
      let isVisible = valueForRef(isVisibleRef);

      if (DEBUG && isVisible !== undefined) {
        deprecate(
          `The \`isVisible\` property on classic component classes is deprecated. Was accessed:\n\n${logTrackingStack!()}`,
          false,
          {
            id: 'ember-component.is-visible',
            until: '4.0.0',
            url: 'https://deprecations.emberjs.com/v3.x#toc_ember-component-is-visible',
            for: 'ember-source',
            since: {
              enabled: '3.15.0-beta.1',
            },
          }
        );
      }

      if (isVisible !== false) {
        return value as string;
      } else if (!value) {
        return SAFE_DISPLAY_NONE;
      } else {
        let style = value + ' ' + DISPLAY_NONE;
        return isHTMLSafe(value) ? htmlSafe(style) : style;
      }
    });
  };

  installIsVisibleBinding = (rootRef: Reference<Component>, operations: ElementOperations) => {
    operations.setAttribute(
      'style',
      createStyleBindingRef!(UNDEFINED_REFERENCE, childRefFor(rootRef, 'isVisible')),
      false,
      null
    );
  };
}

export function createClassNameBindingRef(
  rootRef: Reference<Component>,
  microsyntax: string,
  operations: ElementOperations
) {
  let [prop, truthy, falsy] = microsyntax.split(':');
  let isStatic = prop === '';

  if (isStatic) {
    operations.setAttribute('class', createPrimitiveRef(truthy), true, null);
  } else {
    let isPath = prop.indexOf('.') > -1;
    let parts = isPath ? prop.split('.') : [];
    let value = isPath ? referenceForParts(rootRef, parts) : childRefFor(rootRef, prop);
    let ref;

    if (truthy === undefined) {
      ref = createSimpleClassNameBindingRef(value, isPath ? parts[parts.length - 1] : prop);
    } else {
      ref = createColonClassNameBindingRef(value, truthy, falsy);
    }

    operations.setAttribute('class', ref, false, null);
  }
}

export function createSimpleClassNameBindingRef(inner: Reference, path?: string) {
  let dasherizedPath: string;

  return createComputeRef(() => {
    let value = valueForRef(inner);

    if (value === true) {
      assert(
        'You must pass a path when binding a to a class name using classNameBindings',
        path !== undefined
      );

      return dasherizedPath || (dasherizedPath = dasherize(path!));
    } else if (value || value === 0) {
      return String(value);
    } else {
      return null;
    }
  });
}

export function createColonClassNameBindingRef(inner: Reference, truthy: string, falsy: string) {
  return createComputeRef(() => {
    return valueForRef(inner) ? truthy : falsy;
  });
}
