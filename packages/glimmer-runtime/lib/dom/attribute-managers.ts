import { FIXME, Opaque, Option, Maybe } from 'glimmer-util';
import { DOMNamespace } from './helper';
import * as Simple from './interfaces';
import {
  sanitizeAttributeValue,
  requiresSanitization
} from './sanitized-values';
import { normalizeProperty } from './props';
import { SVG_NAMESPACE } from './helper';
import { normalizeTextValue } from '../compiled/opcodes/content';
import { Environment } from '../environment';

export function defaultManagers(element: Simple.Element, attr: string, isTrusting: boolean, namespace: Option<string>): AttributeManager {
  let tagName = element.tagName;
  let isSVG = element.namespaceURI === SVG_NAMESPACE;

  if (isSVG) {
    return defaultAttributeManagers(tagName, attr);
  }

  let { type, normalized } = normalizeProperty(element, attr);

  if (type === 'attr') {
    return defaultAttributeManagers(tagName, normalized);
  } else {
    return defaultPropertyManagers(tagName, normalized);
  }
}

export function defaultPropertyManagers(tagName: string, attr: string): AttributeManager {
  if (requiresSanitization(tagName, attr)) {
    return new SafePropertyManager(attr);
  }

  if (isUserInputValue(tagName, attr)) {
    return INPUT_VALUE_PROPERTY_MANAGER;
  }

  if (isOptionSelected(tagName, attr)) {
    return OPTION_SELECTED_MANAGER;
  }

  return new PropertyManager(attr);
}

export function defaultAttributeManagers(tagName: string, attr: string): AttributeManager {
  if (requiresSanitization(tagName, attr)) {
    return new SafeAttributeManager(attr);
  }

  return new AttributeManager(attr);
}

export function readDOMAttr(element: Element, attr: string) {
  let isSVG = element.namespaceURI === SVG_NAMESPACE;
  let { type, normalized } = normalizeProperty(element, attr);

  if (isSVG) {
    return element.getAttribute(normalized);
  }

  if (type === 'attr') {
    return element.getAttribute(normalized);
  } {
    return element[normalized];
  }
};

export class AttributeManager {
  constructor(public attr: string) {}

  setAttribute(env: Environment, element: Simple.Element, value: Opaque, namespace?: DOMNamespace) {
    let dom = env.getAppendOperations();
    let normalizedValue = normalizeAttributeValue(value);

    if (!isAttrRemovalValue(normalizedValue)) {
      dom.setAttribute(element, this.attr, normalizedValue, namespace);
    }
  }

  updateAttribute(env: Environment, element: Element, value: Opaque, namespace?: DOMNamespace) {
    if (value === null || value === undefined || value === false) {
      if (namespace) {
        env.getDOM().removeAttributeNS(element, namespace, this.attr);
      } else {
        env.getDOM().removeAttribute(element, this.attr);
      }
    } else {
      this.setAttribute(env, element, value);
    }
  }
};

export class PropertyManager extends AttributeManager {
  setAttribute(env: Environment, element: Simple.Element, value: Opaque, namespace?: DOMNamespace) {
    if (!isAttrRemovalValue(value)) {
      element[this.attr] = value;
    }
  }

  protected removeAttribute(env: Environment, element: Element, namespace?: DOMNamespace) {
    // TODO this sucks but to preserve properties first and to meet current
    // semantics we must do this.
    let { attr } = this;
    if (namespace) {
      env.getDOM().removeAttributeNS(element, namespace, attr);
    } else {
      env.getDOM().removeAttribute(element, attr);
    }
  }

  updateAttribute(env: Environment, element: Element, value: Opaque, namespace?: DOMNamespace) {
    // ensure the property is always updated
    element[this.attr] = value;

    if (isAttrRemovalValue(value)) {
      this.removeAttribute(env, element, namespace);
    }
  }
};

function normalizeAttributeValue(value): Option<string> {
  if (value === false || value === undefined || value === null) {
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

function isAttrRemovalValue<T>(value: Maybe<T>): value is (null | undefined) {
  return value === null || value === undefined;
}

class SafePropertyManager extends PropertyManager {
  setAttribute(env: Environment, element: Simple.Element, value: Opaque) {
    super.setAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
  }

  updateAttribute(env: Environment, element: Element, value: Opaque) {
    super.updateAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
  }
}

function isUserInputValue(tagName: string, attribute: string) {
  return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
}

class InputValuePropertyManager extends AttributeManager {
  setAttribute(env: Environment, element: Simple.Element, value: Opaque) {
    let input = element as FIXME<HTMLInputElement, "This breaks SSR">;
    input.value = normalizeTextValue(value);
  }

  updateAttribute(env: Environment, element: Element, value: Opaque) {
    let input = <HTMLInputElement>element;
    let currentValue = input.value;
    let normalizedValue = normalizeTextValue(value);
    if (currentValue !== normalizedValue) {
      input.value = normalizedValue;
    }
  }
}

export const INPUT_VALUE_PROPERTY_MANAGER: AttributeManager = new InputValuePropertyManager('value');

function isOptionSelected(tagName: string, attribute: string) {
  return tagName === 'OPTION' && attribute === 'selected';
}

class OptionSelectedManager extends PropertyManager {
  setAttribute(env: Environment, element: Simple.Element, value: Opaque) {
    if (value !== null && value !== undefined && value !== false) {
      let option = <HTMLOptionElement>element;
      option.selected = true;
    }
  }

  updateAttribute(env: Environment, element: Element, value: Opaque) {
    let option = <HTMLOptionElement>element;

    if (value) {
      option.selected = true;
    } else {
      option.selected = false;
    }
  }
}

export const OPTION_SELECTED_MANAGER: AttributeManager = new OptionSelectedManager('selected');

class SafeAttributeManager extends AttributeManager {
  setAttribute(env: Environment, element: Element, value: Opaque) {
    super.setAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
  }

  updateAttribute(env: Environment, element: Element, value: Opaque, namespace?: DOMNamespace) {
    super.updateAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
  }
}
