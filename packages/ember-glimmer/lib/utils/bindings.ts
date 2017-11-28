import { Opaque, Option } from '@glimmer/interfaces';
import {
  CachedReference,
  combine,
  map,
  Reference,
  referenceFromParts,
  Tag,
} from '@glimmer/reference';
import {
  ElementOperations,
  Simple
} from '@glimmer/runtime';
import {
  Ops,
} from '@glimmer/wire-format';
import { assert } from 'ember-debug';
import { get } from 'ember-metal';
import { String as StringUtils } from 'ember-runtime';
import { Component } from './curly-component-state-bucket';
import { ROOT_REF } from '../component';
import { htmlSafe, isHTMLSafe, SafeString } from './string';

function referenceForKey(component: Component, key: string) {
  return component[ROOT_REF].get(key);
}

function referenceForParts(component: Component, parts: string[]) {
  let isAttrs = parts[0] === 'attrs';

  // TODO deprecate this
  if (isAttrs) {
    parts.shift();

    if (parts.length === 1) {
      return referenceForKey(component, parts[0]);
    }
  }

  return referenceFromParts(component[ROOT_REF], parts);
}

// TODO we should probably do this transform at build time
export function wrapComponentClassAttribute(hash: any[]) {
  if (!hash) {
    return hash;
  }

  let [ keys, values ] = hash;
  let index = keys.indexOf('class');

  if (index !== -1) {
    let [ type ] = values[index];

    if (type === Ops.Get || type === Ops.MaybeLocal) {
      let getExp = values[index];
      let path = getExp[getExp.length - 1];
      let propName = path[path.length - 1];
      hash[1][index] = [Ops.Helper, ['-class'], [getExp, propName]];
    }
  }

  return hash;
}

export const AttributeBinding = {
  parse(microsyntax: string): [string, string, boolean] {
    let colonIndex = microsyntax.indexOf(':');

    if (colonIndex === -1) {
      assert('You cannot use class as an attributeBinding, use classNameBindings instead.', microsyntax !== 'class');
      return [microsyntax, microsyntax, true];
    } else {
      let prop = microsyntax.substring(0, colonIndex);
      let attribute = microsyntax.substring(colonIndex + 1);

      assert('You cannot use class as an attributeBinding, use classNameBindings instead.', attribute !== 'class');

      return [prop, attribute, false];
    }
  },

  install(element: Simple.Element, component: Component, parsed: [string, string, boolean], operations: ElementOperations) {
    let [prop, attribute, isSimple] = parsed;

    if (attribute === 'id') {
      let elementId = get(component, prop);
      if (elementId == null) {
        elementId = component.elementId;
      }
      operations.addStaticAttribute(element, 'id', elementId);
      return;
    }

    let isPath = prop.indexOf('.') > -1;
    let reference = isPath ? referenceForParts(component, prop.split('.')) : referenceForKey(component, prop);

    assert(`Illegal attributeBinding: '${prop}' is not a valid attribute name.`, !(isSimple && isPath));

    if (attribute === 'style') {
      reference = new StyleBindingReference(reference, referenceForKey(component, 'isVisible'));
    }

    operations.addDynamicAttribute(element, attribute, reference, false);
  },
};

const DISPLAY_NONE = 'display: none;';
const SAFE_DISPLAY_NONE = htmlSafe(DISPLAY_NONE);

class StyleBindingReference extends CachedReference<string | SafeString> {
  public tag: Tag;
  constructor(private inner: Reference<string>, private isVisible: Reference<Opaque>) {
    super();

    this.tag = combine([inner.tag, isVisible.tag]);
  }

  compute(): string | SafeString {
    let value = this.inner.value();
    let isVisible = this.isVisible.value();

    if (isVisible !== false) {
      return value;
    } else if (!value) {
      return SAFE_DISPLAY_NONE;
    } else {
      let style = value + ' ' + DISPLAY_NONE;
      return isHTMLSafe(value) ? htmlSafe(style) : style;
    }
  }
}

export const IsVisibleBinding = {
  install(element: Simple.Element, component: Component, operations: ElementOperations) {
    operations.addDynamicAttribute(element, 'style', map(referenceForKey(component, 'isVisible'), this.mapStyleValue), false);
  },

  mapStyleValue(isVisible: boolean) {
    return isVisible === false ? SAFE_DISPLAY_NONE : null;
  },
};

export const ClassNameBinding = {
  install(element: Simple.Element, component: Component, microsyntax: string, operations: ElementOperations) {
    let [ prop, truthy, falsy ] = microsyntax.split(':');
    let isStatic = prop === '';

    if (isStatic) {
      operations.addStaticAttribute(element, 'class', truthy);
    } else {
      let isPath = prop.indexOf('.') > -1;
      let parts = isPath ? prop.split('.') : [];
      let value = isPath ? referenceForParts(component, parts) : referenceForKey(component, prop);
      let ref;

      if (truthy === undefined) {
        ref = new SimpleClassNameBindingReference(value, isPath ? parts[parts.length - 1] : prop);
      } else {
        ref = new ColonClassNameBindingReference(value, truthy, falsy);
      }

      operations.addDynamicAttribute(element, 'class', ref, false);
    }
  },
};

class SimpleClassNameBindingReference extends CachedReference<Option<string>> {
  public tag: Tag;
  private dasherizedPath: Option<string>;

  constructor(private inner: Reference<Opaque | number>, private path: string) {
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
      return dasherizedPath || (this.dasherizedPath = StringUtils.dasherize(path));
    } else if (value || value === 0) {
      return String(value);
    } else {
      return null;
    }
  }
}

class ColonClassNameBindingReference extends CachedReference<Option<string>> {
  public tag: Tag;

  constructor(private inner: Reference<Opaque>,
              private truthy: Option<string> = null,
              private falsy: Option<string> = null) {
    super();

    this.tag = inner.tag;
  }

  compute(): Option<string> {
    let { inner, truthy, falsy } = this;
    return inner.value() ? truthy : falsy;
  }
}
