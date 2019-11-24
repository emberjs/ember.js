import { get } from '@ember/-internals/metal';
import { assert, deprecate } from '@ember/debug';
import { EMBER_COMPONENT_IS_VISIBLE } from '@ember/deprecated-features';
import { dasherize } from '@ember/string';
import { ElementOperations, Option, WireFormat, SexpOpcodes } from '@glimmer/interfaces';
import { CachedReference, map, Reference } from '@glimmer/reference';
import { PrimitiveReference } from '@glimmer/runtime';
import { combine, Tag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import { Component } from './curly-component-state-bucket';
import { referenceFromParts, RootReference } from './references';
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
    _element: SimpleElement,
    component: Component,
    rootRef: RootReference<Component>,
    parsed: [string, string, boolean],
    operations: ElementOperations
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
      reference = new StyleBindingReference(
        reference,
        referenceForKey(rootRef, 'isVisible'),
        component
      );
    }

    operations.setAttribute(attribute, reference, false, null);
    // operations.addDynamicAttribute(element, attribute, reference, false);
  },
};

const DISPLAY_NONE = 'display: none;';
const SAFE_DISPLAY_NONE = htmlSafe(DISPLAY_NONE);

let StyleBindingReference:
  | undefined
  | { new (...args: any[]): CachedReference<string | SafeString> };

if (EMBER_COMPONENT_IS_VISIBLE) {
  StyleBindingReference = class extends CachedReference<string | SafeString> {
    public tag: Tag;
    constructor(
      private inner: Reference<string>,
      private isVisible: Reference<unknown>,
      private component: Component
    ) {
      super();

      this.tag = combine([inner.tag, isVisible.tag]);
    }

    compute(): string | SafeString {
      let value = this.inner.value();
      let isVisible = this.isVisible.value();

      if (isVisible !== undefined) {
        deprecate(
          `\`isVisible\` is deprecated (from "${this.component._debugContainerKey}")`,
          false,
          {
            id: 'ember-component.is-visible',
            until: '4.0.0',
            url: 'https://deprecations.emberjs.com/v3.x#toc_ember-component-is-visible',
          }
        );
      }

      if (isVisible !== false) {
        return value;
      }

      if (!value) {
        return SAFE_DISPLAY_NONE;
      } else {
        let style = value + ' ' + DISPLAY_NONE;
        return isHTMLSafe(value) ? htmlSafe(style) : style;
      }
    }
  };
}

export let IsVisibleBinding:
  | undefined
  | {
      install(
        element: SimpleElement,
        component: Component,
        rootRef: RootReference<Component>,
        operations: ElementOperations
      ): void;
      mapStyleValue(isVisible: boolean, component: Component): SafeString | null;
    };

if (EMBER_COMPONENT_IS_VISIBLE) {
  IsVisibleBinding = {
    install(
      _element: SimpleElement,
      component: Component,
      rootRef: RootReference<Component>,
      operations: ElementOperations
    ) {
      let componentMapStyleValue = (isVisible: boolean) => {
        return this.mapStyleValue(isVisible, component);
      };

      operations.setAttribute(
        'style',
        map(referenceForKey(rootRef, 'isVisible') as any, componentMapStyleValue),
        false,
        null
      );
      // // the upstream type for addDynamicAttribute's `value` argument
      // // appears to be incorrect. It is currently a Reference<string>, I
      // // think it should be a Reference<string|null>.
      // operations.addDynamicAttribute(element, 'style', ref as any as Reference<string>, false);
    },

    mapStyleValue(isVisible: boolean, component: Component) {
      if (isVisible !== undefined) {
        deprecate(`\`isVisible\` is deprecated (from "${component._debugContainerKey}")`, false, {
          id: 'ember-component.is-visible',
          until: '4.0.0',
          url: 'https://deprecations.emberjs.com/v3.x#toc_ember-component-is-visible',
        });
      }

      return isVisible === false ? SAFE_DISPLAY_NONE : null;
    },
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
      // // the upstream type for addDynamicAttribute's `value` argument
      // // appears to be incorrect. It is currently a Reference<string>, I
      // // think it should be a Reference<string|null>.
      // operations.addDynamicAttribute(element, 'class', ref as any as Reference<string>, false);
    }
  },
};

export class SimpleClassNameBindingReference extends CachedReference<Option<string>> {
  public tag: Tag;
  private dasherizedPath: Option<string>;

  constructor(private inner: Reference<unknown | number>, private path: string) {
    super();

    this.tag = inner.tag;
    this.inner = inner;
    this.path = path;
    this.dasherizedPath = null;
  }

  compute(): Option<string> {
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

class ColonClassNameBindingReference extends CachedReference<Option<string>> {
  public tag: Tag;

  constructor(
    private inner: Reference<unknown>,
    private truthy: Option<string> = null,
    private falsy: Option<string> = null
  ) {
    super();

    this.tag = inner.tag;
  }

  compute(): Option<string> {
    let { inner, truthy, falsy } = this;
    return inner.value() ? truthy : falsy;
  }
}
