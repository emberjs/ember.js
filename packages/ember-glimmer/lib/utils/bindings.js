import { assert } from 'ember-metal/debug';
import { dasherize } from 'ember-runtime/system/string';
import { CachedReference, ConstReference, map, referenceFromParts } from 'glimmer-reference';
import { ROOT_REF } from '../component';
import { htmlSafe, isHTMLSafe } from './string';

function referenceForKey(component, key) {
  return component[ROOT_REF].get(key);
}

function referenceForParts(component, parts) {
  return referenceFromParts(component[ROOT_REF], parts);
}

export const AttributeBinding = {
  parse(microsyntax) {
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

  apply(component, parsed, operations) {
    let [prop, attribute, isSimple] = parsed;
    let isPath = prop.indexOf('.') > -1;
    let reference = isPath ? referenceForParts(component, prop.split('.')) : referenceForKey(component, prop);

    assert(`Illegal attributeBinding: '${prop}' is not a valid attribute name.`, !(isSimple && isPath));

    if (attribute === 'style') {
      reference = new StyleBindingReference(reference, referenceForKey(component, 'isVisible'));
    } else if (attribute === 'id') {
      reference = new ConstReference(this.mapAttributeValue(reference.value()));
    } else {
      reference = map(reference, this.mapAttributeValue);
    }

    operations.addAttribute(attribute, reference);
  },

  mapAttributeValue(value) {
    if (value === null || value === undefined || value === false) {
      return null;
    } else if (value === true) {
      // Note:
      // This is here to mimic functionality in HTMLBars for properties.
      // For instance when a property like "disable" is set all of these
      // forms are valid and have the same disabled functionality:
      //
      // <input disabled />
      // <input disabled="true" />
      // <input disabled="false" />
      // <input disabled="" />
      //
      // For compatability sake we do not just cast the true boolean to
      // a string. Potentially we can revisit this in the future as the
      // casting feels better and we can remove this branch.
      return '';
    } else {
      return value;
    }
  }
};

const DISPLAY_NONE = 'display: none;';
const SAFE_DISPLAY_NONE = htmlSafe(DISPLAY_NONE);

class StyleBindingReference extends CachedReference {
  constructor(inner, isVisible) {
    super();

    this.tag = inner.tag;
    this.inner = inner;
    this.isVisible = isVisible;
  }

  compute() {
    let value = this.inner.value();
    let isVisible = this.isVisible.value();

    if (isVisible !== false) {
      return value;
    } else if (!value && value !== 0) {
      return SAFE_DISPLAY_NONE;
    } else {
      let style = value + ' ' + DISPLAY_NONE;
      return isHTMLSafe(value) ? htmlSafe(style) : style;
    }
  }
}

export const IsVisibleBinding = {
  apply(component, operations) {
    operations.addAttribute('style', map(referenceForKey(component, 'isVisible'), this.mapStyleValue));
  },

  mapStyleValue(isVisible) {
    return isVisible === false ? SAFE_DISPLAY_NONE : null;
  }
};

export const ClassNameBinding = {
  apply(component, microsyntax, operations) {
    let [ prop, truthy, falsy ] = microsyntax.split(':');
    let isPath = prop.indexOf('.') > -1;
    let parts = isPath && prop.split('.');
    let value = isPath ? referenceForParts(component, parts) : referenceForKey(component, prop);
    let ref;

    if (truthy === undefined) {
      ref = new SimpleClassNameBindingReference(value, isPath ? parts[parts.length - 1] : prop);
    } else {
      ref = new ColonClassNameBindingReference(value, truthy, falsy);
    }

    operations.addAttribute('class', ref);
  }
};

class SimpleClassNameBindingReference extends CachedReference {
  constructor(inner, path) {
    super();

    this.tag = inner.tag;
    this.inner = inner;
    this.path = path;
    this.dasherizedPath = null;
  }

  compute() {
    let value = this.inner.value();

    if (value === true) {
      let { path, dasherizedPath } = this;
      return dasherizedPath || (this.dasherizedPath = dasherize(path));
    } else if (value || value === 0) {
      return value;
    } else {
      return null;
    }
  }
}

class ColonClassNameBindingReference extends CachedReference {
  constructor(inner, truthy, falsy) {
    super();

    this.tag = inner.tag;
    this.inner = inner;
    this.truthy = truthy || null;
    this.falsy = falsy || null;
  }

  compute() {
    let { inner, truthy, falsy } = this;
    return inner.value() ? truthy : falsy;
  }
}
