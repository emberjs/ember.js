import { DEBUG } from '@glimmer/env';
import type {
  AttributeCursor,
  AttributeOperation,
  AttrNamespace,
  Dict,
  Environment,
  Nullable,
  SimpleElement,
  TreeBuilder,
} from '@glimmer/interfaces';
import { NS_SVG } from '@glimmer/constants/lib/dom';
import { castToBrowser } from '@glimmer/debug-util/lib/simple-cast';
import { warnIfStyleNotTrusted } from '@glimmer/global-context';

import type { MutableKey } from '../element-builder';

import { normalizeStringValue } from '../../dom/normalize';
import { normalizeProperty } from '../../dom/props';
import { requiresSanitization, sanitizeAttributeValue } from '../../dom/sanitized-values';

export function dynamicAttribute(
  element: SimpleElement,
  attr: string,
  namespace: Nullable<AttrNamespace>,
  isTrusting = false
): DynamicAttribute {
  const { tagName, namespaceURI } = element;
  const attribute = { element, name: attr, namespace };

  if (DEBUG && attr === 'style' && !isTrusting) {
    return new DebugStyleAttributeManager(attribute);
  }

  if (namespaceURI === NS_SVG) {
    return buildDynamicAttribute(tagName, attr, attribute);
  }

  const { type, normalized } = normalizeProperty(element, attr);

  if (type === 'attr') {
    return buildDynamicAttribute(tagName, normalized, attribute);
  } else {
    return buildDynamicProperty(tagName, normalized, attribute);
  }
}

function buildDynamicAttribute(
  tagName: string,
  name: string,
  attribute: AttributeCursor
): DynamicAttribute {
  if (requiresSanitization(tagName, name)) {
    return new SafeDynamicAttribute(attribute);
  } else {
    return new SimpleDynamicAttribute(attribute);
  }
}

function buildDynamicProperty(
  tagName: string,
  name: string,
  attribute: AttributeCursor
): DynamicAttribute {
  if (requiresSanitization(tagName, name)) {
    return new SafeDynamicProperty(name, attribute);
  }

  if (isUserInputValue(tagName, name)) {
    return new InputValueDynamicAttribute(name, attribute);
  }

  if (isOptionSelected(tagName, name)) {
    return new OptionSelectedDynamicAttribute(name, attribute);
  }

  return new DefaultDynamicProperty(name, attribute);
}

export abstract class DynamicAttribute implements AttributeOperation {
  constructor(public attribute: AttributeCursor) {}

  abstract set(dom: TreeBuilder, value: unknown, env: Environment): void;
  abstract update(value: unknown, env: Environment): void;
}

export class SimpleDynamicAttribute extends DynamicAttribute {
  set(dom: TreeBuilder, value: unknown, _env: Environment): void {
    const normalizedValue = normalizeValue(value);

    if (normalizedValue !== null) {
      const { name, namespace } = this.attribute;
      dom.__setAttribute(name, normalizedValue, namespace);
    }
  }

  update(value: unknown, _env: Environment): void {
    const normalizedValue = normalizeValue(value);
    const { element, name } = this.attribute;

    if (normalizedValue === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, normalizedValue);
    }
  }
}

export class DefaultDynamicProperty extends DynamicAttribute {
  constructor(
    private normalizedName: string,
    attribute: AttributeCursor
  ) {
    super(attribute);
  }

  value: unknown;
  set(dom: TreeBuilder, value: unknown, _env: Environment): void {
    if (!isAttrRemoval(value)) {
      this.value = value;
      dom.__setProperty(this.normalizedName, value);
    }
  }

  update(value: unknown, _env: Environment): void {
    const { element } = this.attribute;

    if (this.value !== value) {
      // Assign the property first so reactive properties (e.g. `input.checked`,
      // `input.value`) are reset to the framework-supplied state before we
      // remove the reflected attribute. For string-valued IDL attributes (e.g.
      // `autocomplete`, `name`, `popover`), assigning `false` would coerce to
      // the string `"false"` — `removeAttribute` below resets the property
      // back to its default via reflection.
      (element as unknown as Element)[this.normalizedName as MutableKey<Element>] = this.value =
        value as never;

      if (isAttrRemoval(value)) {
        this.removeAttribute();
      }
    }
  }

  protected removeAttribute() {
    // TODO this sucks but to preserve properties first and to meet current
    // semantics we must do this.
    const { element, namespace } = this.attribute;

    if (namespace) {
      element.removeAttributeNS(namespace, this.normalizedName);
    } else {
      element.removeAttribute(this.normalizedName);
    }
  }
}

export class SafeDynamicProperty extends DefaultDynamicProperty {
  override set(dom: TreeBuilder, value: unknown, env: Environment): void {
    const { element, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.set(dom, sanitized, env);
  }

  override update(value: unknown, env: Environment): void {
    const { element, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.update(sanitized, env);
  }
}

export class SafeDynamicAttribute extends SimpleDynamicAttribute {
  override set(dom: TreeBuilder, value: unknown, env: Environment): void {
    const { element, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.set(dom, sanitized, env);
  }

  override update(value: unknown, env: Environment): void {
    const { element, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.update(sanitized, env);
  }
}

export class InputValueDynamicAttribute extends DefaultDynamicProperty {
  override set(dom: TreeBuilder, value: unknown) {
    // Treat `false` like `null`/`undefined` — clearing the value rather than
    // letting `String(false)` set the input to the literal string `"false"`.
    // See https://github.com/emberjs/ember.js/issues/21344.
    const normalized = isAttrRemoval(value) ? '' : normalizeStringValue(value);
    dom.__setProperty('value', normalized);

    // GH#19219: Browsers don't reflect `input.value = ''` as a value attribute when
    // type is later changed to "radio"/"checkbox". Explicitly set the attribute for <input>.
    // Not needed for <textarea> (no value attribute). The attribute is only added when
    // the user explicitly passed `''` — implicit empties (`null`, `undefined`, `false`)
    // continue to render as `<input>` without a value attribute.
    if (value === '' && this.attribute.element.tagName === 'INPUT') {
      dom.__setAttribute('value', '', null);
    }
  }

  override update(value: unknown) {
    const input = castToBrowser(this.attribute.element, ['input', 'textarea']);
    const currentValue = input.value;
    const normalizedValue = isAttrRemoval(value) ? '' : normalizeStringValue(value);
    if (currentValue !== normalizedValue) {
      input.value = normalizedValue;
    }
  }
}

export class OptionSelectedDynamicAttribute extends DefaultDynamicProperty {
  override set(dom: TreeBuilder, value: unknown): void {
    if (value !== null && value !== undefined && value !== false) {
      dom.__setProperty('selected', true);
    }
  }

  override update(value: unknown): void {
    const option = castToBrowser(this.attribute.element, 'option');

    if (value) {
      option.selected = true;
    } else {
      option.selected = false;
    }
  }
}

function isOptionSelected(tagName: string, attribute: string) {
  return tagName === 'OPTION' && attribute === 'selected';
}

function isUserInputValue(tagName: string, attribute: string) {
  return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
}

/**
 * Returns `true` for the sentinel values that signal "this attribute is not
 * present" in a bare attribute expression (`attr={{value}}`). Keeping these
 * three values in lockstep across every dispatch path (plain attribute, DOM
 * property, sanitized attribute, input value, …) is what makes
 * `<input autocomplete={{false}}>` and `<input autocomplete={{null}}>` behave
 * the same way. See https://github.com/emberjs/ember.js/issues/21344.
 */
function isAttrRemoval(value: unknown): boolean {
  return value === null || value === undefined || value === false;
}

function normalizeValue(value: unknown): Nullable<string> {
  if (
    value === false ||
    value === undefined ||
    value === null ||
    typeof (value as Dict).toString === 'undefined'
  ) {
    return null;
  }
  if (value === true) {
    return '';
  }
  // onclick function etc in SSR
  if (typeof value === 'function') {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @fixme
  return String(value);
}

let DebugStyleAttributeManager: {
  new (attribute: AttributeCursor): AttributeOperation;
};

if (DEBUG) {
  DebugStyleAttributeManager = class extends SimpleDynamicAttribute {
    override set(dom: TreeBuilder, value: unknown, env: Environment): void {
      warnIfStyleNotTrusted(value);

      super.set(dom, value, env);
    }
    override update(value: unknown, env: Environment): void {
      warnIfStyleNotTrusted(value);

      super.update(value, env);
    }
  };
}
