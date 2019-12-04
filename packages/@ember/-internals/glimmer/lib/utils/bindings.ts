import { get } from '@ember/-internals/metal';
import { assert, deprecate } from '@ember/debug';
import { EMBER_COMPONENT_IS_VISIBLE } from '@ember/deprecated-features';
import { dasherize } from '@ember/string';
import { DEBUG } from '@glimmer/env';
import { ElementOperations, Option, WireFormat, SexpOpcodes } from '@glimmer/interfaces';
import { Reference, RootReference, VersionedPathReference, VersionedReference } from '@glimmer/reference';
import { PrimitiveReference, UNDEFINED_REFERENCE } from '@glimmer/runtime';
import { combine, Tag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import { EmberVMEnvironment } from '../environment';
import { Component } from './curly-component-state-bucket';
import { referenceFromParts } from './references';
import { htmlSafe, isHTMLSafe, SafeString } from './string';

export function referenceForKey(rootRef: RootReference<Component>, key: string) {
  return rootRef.get(key);
}

function referenceForParts(rootRef: RootReference<Component>, parts: string[]): Reference {
  let isAttrs = parts[0] === 'attrs';

  // TODO deprecate this
  if (isAttrs) {
    parts.shift();

    if (parts.length === 1) {
      return referenceForKey(rootRef, parts[0]);
    }
  }

  return referenceFromParts(rootRef, parts);
}

// TODO we should probably do this transform at build time
// export function wrapComponentClassAttribute(hash: Core.Hash) {
//   if (hash === null) {
//     return;
//   }

//   let [keys, values] = hash;
//   let index = keys === null ? -1 : keys.indexOf('class');

//   if (index !== -1) {
//     let value = values[index];
//     if (!Array.isArray(value)) {
//       return;
//     }

//     let [type] = value;

//     if (type === Ops.Get || type === Ops.MaybeLocal) {
//       let path = value[value.length - 1];
//       let propName = path[path.length - 1];
//       values[index] = [Ops.Helper, '-class', [value, propName], null];
//     }
//   }
// }

export const AttributeBinding = {
  parse(microsyntax: string): [string, string, boolean] {
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
  },

  install(
    component: Component,
    rootRef: RootReference<Component>,
    parsed: [string, string, boolean],
    operations: ElementOperations,
    env: EmberVMEnvironment
  ) {
    let [prop, attribute, isSimple] = parsed;

    if (attribute === 'id') {
      let elementId = get(component, prop);
      if (elementId === undefined || elementId === null) {
        elementId = component.elementId;
      }
      elementId = PrimitiveReference.create(elementId);
      operations.setAttribute('id', elementId, true, null);
      // operations.addStaticAttribute(element, 'id', elementId);
      return;
    }

    let isPath = prop.indexOf('.') > -1;
    let reference = isPath
      ? referenceForParts(rootRef, prop.split('.'))
      : referenceForKey(rootRef, prop);

    assert(
      `Illegal attributeBinding: '${prop}' is not a valid attribute name.`,
      !(isSimple && isPath)
    );

    if (
      EMBER_COMPONENT_IS_VISIBLE &&
      attribute === 'style' &&
      StyleBindingReference !== undefined
    ) {
      reference = new StyleBindingReference(rootRef, reference, referenceForKey(rootRef, 'isVisible'), env);
    }

    operations.setAttribute(attribute, reference, false, null);
    // operations.addDynamicAttribute(element, attribute, reference, false);
  },
};

const DISPLAY_NONE = 'display: none;';
const SAFE_DISPLAY_NONE = htmlSafe(DISPLAY_NONE);

let StyleBindingReference:
  | undefined
  | {
      new (
        parent: VersionedPathReference<Component>,
        inner: Reference<unknown>,
        isVisible: Reference<unknown>,
        env: EmberVMEnvironment
      ): VersionedReference<string | SafeString>;
    };

export let installIsVisibleBinding:
  | undefined
  | ((
      rootRef: RootReference<Component>,
      operations: ElementOperations,
      environment: EmberVMEnvironment
    ) => void);

if (EMBER_COMPONENT_IS_VISIBLE) {
  StyleBindingReference = class implements VersionedPathReference<string | SafeString> {
    public tag: Tag;
    constructor(
      parent: VersionedPathReference<Component>,
      private inner: Reference<unknown>,
      private isVisible: Reference<unknown>,
      private env: EmberVMEnvironment
    ) {
      this.tag = combine([inner.tag, isVisible.tag]);

      if (DEBUG) {
        env.setTemplatePathDebugContext(this, 'style', parent);
      }
    }

    value(): string | SafeString {
      let value = this.inner.value();
      let isVisible = this.isVisible.value();

      if (isVisible !== undefined) {
        deprecate(
          `\`isVisible\` is deprecated. Was accessed from:\n\n${this.env.getTemplatePathDebugContext(
            this
          )}`,
          false,
          {
            id: 'ember-component.is-visible',
            until: '4.0.0',
            url: 'https://deprecations.emberjs.com/v3.x#toc_ember-component-is-visible',
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
    }

    get() {
      return UNDEFINED_REFERENCE;
    }
  };

  installIsVisibleBinding = (
    rootRef: RootReference<Component>,
    operations: ElementOperations,
    environment: EmberVMEnvironment
  ) => {
    operations.setAttribute(
      'style',
      new StyleBindingReference!(rootRef, UNDEFINED_REFERENCE, rootRef.get('isVisible'), environment),
      false,
      null
    );
  };
}

export const ClassNameBinding = {
  install(
    _element: SimpleElement,
    rootRef: RootReference<Component>,
    microsyntax: string,
    operations: ElementOperations
  ) {
    let [prop, truthy, falsy] = microsyntax.split(':');
    let isStatic = prop === '';

    if (isStatic) {
      operations.setAttribute('class', PrimitiveReference.create(truthy), true, null);
    } else {
      let isPath = prop.indexOf('.') > -1;
      let parts = isPath ? prop.split('.') : [];
      let value = isPath ? referenceForParts(rootRef, parts) : referenceForKey(rootRef, prop);
      let ref;

      if (truthy === undefined) {
        ref = new SimpleClassNameBindingReference(value, isPath ? parts[parts.length - 1] : prop);
      } else {
        ref = new ColonClassNameBindingReference(value, truthy, falsy);
      }

      operations.setAttribute('class', ref, false, null);
    }
  },
};

export class SimpleClassNameBindingReference implements VersionedReference<Option<string>> {
  public tag: Tag;
  private dasherizedPath: Option<string>;

  constructor(private inner: Reference<unknown | number>, private path: string) {
    this.tag = inner.tag;
    this.dasherizedPath = null;
  }

  value(): Option<string> {
    let value = this.inner.value();

    if (value === true) {
      let { path, dasherizedPath } = this;
      return dasherizedPath || (this.dasherizedPath = dasherize(path));
    } else if (value || value === 0) {
      return String(value);
    } else {
      return null;
    }
  }
}

class ColonClassNameBindingReference implements VersionedReference<Option<string>> {
  public tag: Tag;

  constructor(
    private inner: Reference<unknown>,
    private truthy: Option<string> = null,
    private falsy: Option<string> = null
  ) {
    this.tag = inner.tag;
  }

  value(): Option<string> {
    let { inner, truthy, falsy } = this;
    return inner.value() ? truthy : falsy;
  }
}
