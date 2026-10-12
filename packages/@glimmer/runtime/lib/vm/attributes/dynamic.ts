import { DEBUG } from '@glimmer/env';
import type {
  AttributeCursor,
  AttributeOperation,
  AttrNamespace,
  Dict,
  DOMRenderer,
  Environment,
  Nullable,
  SimpleElement,
  TreeBuilder,
} from '@glimmer/interfaces';
import { NS_SVG } from '@glimmer/constants/lib/dom';
import { warnIfStyleNotTrusted } from '@glimmer/global-context';

import { normalizeStringValue } from '../../dom/normalize';
import { normalizeProperty } from '../../dom/props';
import { requiresSanitization, sanitizeAttributeValue } from '../../dom/sanitized-values';

export function dynamicAttribute(
  dom: DOMRenderer,
  element: SimpleElement,
  attr: string,
  namespace: Nullable<AttrNamespace>,
  isTrusting = false
): DynamicAttribute {
  const tagName = dom.tagName(element);
  const attribute = { element, name: attr, namespace, tagName };

  if (DEBUG && attr === 'style' && !isTrusting) {
    return new DebugStyleAttributeManager(attribute);
  }

  if (dom.namespaceURI(element) === NS_SVG) {
    return buildDynamicAttribute(tagName, attr, attribute);
  }

  const { type, normalized } = normalizeProperty(dom, element, attr);

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

  update(value: unknown, env: Environment): void {
    const normalizedValue = normalizeValue(value);
    const { element, name } = this.attribute;

    if (normalizedValue === null) {
      env.dom.removeAttribute(element, name);
    } else {
      env.dom.setAttribute(element, name, normalizedValue);
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
    if (value !== null && value !== undefined) {
      this.value = value;
      dom.__setProperty(this.normalizedName, value);
    }
  }

  update(value: unknown, env: Environment): void {
    const { element } = this.attribute;

    if (this.value !== value) {
      env.dom.setProperty(element, this.normalizedName, (this.value = value));

      if (value === null || value === undefined) {
        this.removeAttribute(env.dom);
      }
    }
  }

  protected removeAttribute(dom: DOMRenderer) {
    // TODO this sucks but to preserve properties first and to meet current
    // semantics we must do this.
    const { element, namespace } = this.attribute;

    dom.removeAttribute(element, this.normalizedName, namespace);
  }
}

export class SafeDynamicProperty extends DefaultDynamicProperty {
  override set(dom: TreeBuilder, value: unknown, env: Environment): void {
    const { tagName, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(tagName, name, value);
    super.set(dom, sanitized, env);
  }

  override update(value: unknown, env: Environment): void {
    const { tagName, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(tagName, name, value);
    super.update(sanitized, env);
  }
}

export class SafeDynamicAttribute extends SimpleDynamicAttribute {
  override set(dom: TreeBuilder, value: unknown, env: Environment): void {
    const { tagName, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(tagName, name, value);
    super.set(dom, sanitized, env);
  }

  override update(value: unknown, env: Environment): void {
    const { tagName, name } = this.attribute;
    const sanitized = sanitizeAttributeValue(tagName, name, value);
    super.update(sanitized, env);
  }
}

export class InputValueDynamicAttribute extends DefaultDynamicProperty {
  override set(dom: TreeBuilder, value: unknown) {
    const normalized = normalizeStringValue(value);
    dom.__setProperty('value', normalized);

    // GH#19219: Browsers don't reflect `input.value = ''` as a value attribute when
    // type is later changed to "radio"/"checkbox". Explicitly set the attribute for <input>.
    // Not needed for <textarea> (no value attribute).
    if (value === '' && this.attribute.tagName === 'INPUT') {
      dom.__setAttribute('value', '', null);
    }
  }

  override update(value: unknown, env: Environment) {
    const input = this.attribute.element;
    const currentValue = env.dom.getProperty(input, 'value');
    const normalizedValue = normalizeStringValue(value);
    if (currentValue !== normalizedValue) {
      env.dom.setProperty(input, 'value', normalizedValue);
    }
  }
}

export class OptionSelectedDynamicAttribute extends DefaultDynamicProperty {
  override set(dom: TreeBuilder, value: unknown): void {
    if (value !== null && value !== undefined && value !== false) {
      dom.__setProperty('selected', true);
    }
  }

  override update(value: unknown, env: Environment): void {
    env.dom.setProperty(this.attribute.element, 'selected', value ? true : false);
  }
}

function isOptionSelected(tagName: string, attribute: string) {
  return tagName === 'OPTION' && attribute === 'selected';
}

function isUserInputValue(tagName: string, attribute: string) {
  return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
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
