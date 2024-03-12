import { get } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { dasherize } from '@ember/-internals/string';
import type { ElementOperations } from '@glimmer/interfaces';
import type { Reactive } from '@glimmer/reference';
import {
  Formula,
  createPrimitiveCell,
  getReactiveProperty,
  getReactivePath,
  unwrapReactive,
} from '@glimmer/reference';
import type Component from '../component';

function referenceForParts(rootRef: Reactive<Component>, parts: string[]): Reactive {
  let isAttrs = parts[0] === 'attrs';

  // TODO deprecate this
  if (isAttrs) {
    parts.shift();

    if (parts.length === 1) {
      return getReactiveProperty(rootRef, parts[0]!);
    }
  }

  return getReactivePath(rootRef, parts);
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
  rootRef: Reactive<Component>,
  parsed: [string, string, boolean],
  operations: ElementOperations
) {
  let [prop, attribute, isSimple] = parsed;

  if (attribute === 'id') {
    // SAFETY: `get` could not infer the type of `prop` and just gave us `unknown`.
    //         we may want to throw an error in the future if the value isn't string or null/undefined.
    let elementId = get(component, prop) as string | null;
    if (elementId === undefined || elementId === null) {
      elementId = component.elementId;
    }
    assert(
      `Invalid elementId: ${elementId}`,
      elementId === undefined || elementId === null || typeof elementId === 'string'
    );
    let elementIdRef = createPrimitiveCell(elementId);
    operations.setAttribute('id', elementIdRef, true, null);
    return;
  }

  let isPath = prop.indexOf('.') > -1;
  let reference = isPath
    ? referenceForParts(rootRef, prop.split('.'))
    : getReactiveProperty(rootRef, prop);

  assert(
    `Illegal attributeBinding: '${prop}' is not a valid attribute name.`,
    !(isSimple && isPath)
  );

  operations.setAttribute(attribute, reference, false, null);
}

export function createClassNameBindingRef(
  rootRef: Reactive<Component>,
  microsyntax: string,
  operations: ElementOperations
) {
  let parts = microsyntax.split(':');
  let [prop, truthy, falsy] = parts;
  // NOTE: This could be an empty string
  assert('has prop', prop !== undefined); // Will always have at least one part

  let isStatic = prop === '';

  if (isStatic) {
    operations.setAttribute('class', createPrimitiveCell(truthy), true, null);
  } else {
    let isPath = prop.indexOf('.') > -1;
    let parts = isPath ? prop.split('.') : [];
    let value = isPath ? referenceForParts(rootRef, parts) : getReactiveProperty(rootRef, prop);
    let ref;

    if (truthy === undefined) {
      ref = createSimpleClassNameBindingRef(value, isPath ? parts[parts.length - 1] : prop);
    } else {
      ref = createColonClassNameBindingRef(value, truthy, falsy);
    }

    operations.setAttribute('class', ref, false, null);
  }
}

export function createSimpleClassNameBindingRef(inner: Reactive, path?: string) {
  let dasherizedPath: string;

  return Formula(() => {
    let value = unwrapReactive(inner);

    if (value === true) {
      assert(
        'You must pass a path when binding a to a class name using classNameBindings',
        path !== undefined
      );

      return dasherizedPath || (dasherizedPath = dasherize(path));
    } else if (value || value === 0) {
      return String(value);
    } else {
      return null;
    }
  });
}

export function createColonClassNameBindingRef(
  inner: Reactive,
  truthy: string,
  falsy: string | undefined
) {
  return Formula(() => {
    return unwrapReactive(inner) ? truthy : falsy;
  });
}
