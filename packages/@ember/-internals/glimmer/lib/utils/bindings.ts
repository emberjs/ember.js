import { get } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { dasherize } from '@ember/string';
import { ElementOperations } from '@glimmer/interfaces';
import {
  childRefFor,
  childRefFromParts,
  createComputeRef,
  createPrimitiveRef,
  Reference,
  valueForRef,
} from '@glimmer/reference';
import Component from '../component';

function referenceForParts(rootRef: Reference<Component>, parts: string[]): Reference {
  let isAttrs = parts[0] === 'attrs';

  // TODO deprecate this
  if (isAttrs) {
    parts.shift();

    if (parts.length === 1) {
      return childRefFor(rootRef, parts[0]!);
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
    let elementIdRef = createPrimitiveRef(elementId);
    operations.setAttribute('id', elementIdRef, true, null);
    return;
  }

  let isPath = prop.indexOf('.') > -1;
  let reference = isPath ? referenceForParts(rootRef, prop.split('.')) : childRefFor(rootRef, prop);

  assert(
    `Illegal attributeBinding: '${prop}' is not a valid attribute name.`,
    !(isSimple && isPath)
  );

  operations.setAttribute(attribute, reference, false, null);
}

export function createClassNameBindingRef(
  rootRef: Reference<Component>,
  microsyntax: string,
  operations: ElementOperations
) {
  let parts = microsyntax.split(':');
  let [prop, truthy, falsy] = parts;
  // NOTE: This could be an empty string
  assert('has prop', prop !== undefined); // Will always have at least one part

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

      return dasherizedPath || (dasherizedPath = dasherize(path));
    } else if (value || value === 0) {
      return String(value);
    } else {
      return null;
    }
  });
}

export function createColonClassNameBindingRef(
  inner: Reference,
  truthy: string,
  falsy: string | undefined
) {
  return createComputeRef(() => {
    return valueForRef(inner) ? truthy : falsy;
  });
}
