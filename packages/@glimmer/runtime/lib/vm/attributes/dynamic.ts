import { Dict, Environment, Option } from '@glimmer/interfaces';
import { AttrNamespace, Namespace, SimpleElement } from '@simple-dom/interface';
import { normalizeStringValue } from '../../dom/normalize';
import { normalizeProperty } from '../../dom/props';
import { requiresSanitization, sanitizeAttributeValue } from '../../dom/sanitized-values';
import { ElementBuilder } from '../element-builder';
import { Attribute, AttributeOperation } from './index';

export function dynamicAttribute(
  element: SimpleElement,
  attr: string,
  namespace: Option<AttrNamespace>
): DynamicAttribute {
  let { tagName, namespaceURI } = element;
  let attribute = { element, name: attr, namespace };

  if (namespaceURI === Namespace.SVG) {
    return buildDynamicAttribute(tagName, attr, attribute);
  }

  let { type, normalized } = normalizeProperty(element, attr);

  if (type === 'attr') {
    return buildDynamicAttribute(tagName, normalized, attribute);
  } else {
    return buildDynamicProperty(tagName, normalized, attribute);
  }
}

function buildDynamicAttribute(
  tagName: string,
  name: string,
  attribute: Attribute
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
  attribute: Attribute
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
  constructor(public attribute: Attribute) {}

  abstract set(dom: ElementBuilder, value: unknown, env: Environment): void;
  abstract update(value: unknown, env: Environment): void;
}

export class SimpleDynamicAttribute extends DynamicAttribute {
  set(dom: ElementBuilder, value: unknown, _env: Environment): void {
    let normalizedValue = normalizeValue(value);

    if (normalizedValue !== null) {
      let { name, namespace } = this.attribute;
      dom.__setAttribute(name, normalizedValue, namespace);
    }
  }

  update(value: unknown, _env: Environment): void {
    let normalizedValue = normalizeValue(value);
    let { element, name } = this.attribute;

    if (normalizedValue === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, normalizedValue);
    }
  }
}

export class DefaultDynamicProperty extends DynamicAttribute {
  constructor(private normalizedName: string, attribute: Attribute) {
    super(attribute);
  }

  value: unknown;
  set(dom: ElementBuilder, value: unknown, _env: Environment): void {
    if (value !== null && value !== undefined) {
      this.value = value;
      dom.__setProperty(this.normalizedName, value);
    }
  }

  update(value: unknown, _env: Environment): void {
    let { element } = this.attribute;

    if (this.value !== value) {
      (element as Dict)[this.normalizedName] = this.value = value;

      if (value === null || value === undefined) {
        this.removeAttribute();
      }
    }
  }

  protected removeAttribute() {
    // TODO this sucks but to preserve properties first and to meet current
    // semantics we must do this.
    let { element, namespace } = this.attribute;

    if (namespace) {
      element.removeAttributeNS(namespace, this.normalizedName);
    } else {
      element.removeAttribute(this.normalizedName);
    }
  }
}

export class SafeDynamicProperty extends DefaultDynamicProperty {
  set(dom: ElementBuilder, value: unknown, env: Environment): void {
    let { element, name } = this.attribute;
    let sanitized = sanitizeAttributeValue(env, element, name, value);
    super.set(dom, sanitized, env);
  }

  update(value: unknown, env: Environment): void {
    let { element, name } = this.attribute;
    let sanitized = sanitizeAttributeValue(env, element, name, value);
    super.update(sanitized, env);
  }
}

export class SafeDynamicAttribute extends SimpleDynamicAttribute {
  set(dom: ElementBuilder, value: unknown, env: Environment): void {
    let { element, name } = this.attribute;
    let sanitized = sanitizeAttributeValue(env, element, name, value);
    super.set(dom, sanitized, env);
  }

  update(value: unknown, env: Environment): void {
    let { element, name } = this.attribute;
    let sanitized = sanitizeAttributeValue(env, element, name, value);
    super.update(sanitized, env);
  }
}

export class InputValueDynamicAttribute extends DefaultDynamicProperty {
  set(dom: ElementBuilder, value: unknown) {
    dom.__setProperty('value', normalizeStringValue(value));
  }

  update(value: unknown) {
    let input = this.attribute.element as HTMLInputElement;
    let currentValue = input.value;
    let normalizedValue = normalizeStringValue(value);
    if (currentValue !== normalizedValue) {
      input.value = normalizedValue!;
    }
  }
}

export class OptionSelectedDynamicAttribute extends DefaultDynamicProperty {
  set(dom: ElementBuilder, value: unknown): void {
    if (value !== null && value !== undefined && value !== false) {
      dom.__setProperty('selected', true);
    }
  }

  update(value: unknown): void {
    let option = this.attribute.element as HTMLOptionElement;

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

function normalizeValue(value: unknown): Option<string> {
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
