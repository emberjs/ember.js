import type {
  AttributeCursor,
  AttributeOperation,
  AttrNamespace,
  Dict,
  TreeBuilder,
  Environment,
  Nullable,
  SimpleElement,
} from '@glimmer/interfaces';
import { NS_SVG } from '@glimmer/constants';
import { castToBrowser } from '@glimmer/debug-util';
import { warnIfStyleNotTrusted } from '@glimmer/global-context';

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

  if (import.meta.env.DEV && attr === 'style' && !isTrusting) {
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
    if (value !== null && value !== undefined) {
      this.value = value;
      dom.__setProperty(this.normalizedName, value);
    }
  }

  update(value: unknown, _env: Environment): void {
    const { element } = this.attribute;

    if (this.value !== value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (element as any)[this.normalizedName] = this.value = value;

      if (value === null || value === undefined) {
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
    dom.__setProperty('value', normalizeStringValue(value));
  }

  override update(value: unknown) {
    const input = castToBrowser(this.attribute.element, ['input', 'textarea']);
    const currentValue = input.value;
    const normalizedValue = normalizeStringValue(value);
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

  return String(value);
}

let DebugStyleAttributeManager: {
  new (attribute: AttributeCursor): AttributeOperation;
};

if (import.meta.env.DEV) {
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
