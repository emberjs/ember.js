import { FIXME, Opaque } from 'glimmer-util';
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

export interface AttributeManager {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque, namespace?: string): void;
  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: string): void;
}

interface PropertyManager {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque, namespace?: string): void;
  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: string): void;
  removeAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: string): void;
}

export function defaultManagers(element: Simple.Element, attr: string, isTrusting: boolean, namespace: string) {
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

export function defaultPropertyManagers(tagName: string, attr: string) {
  if (requiresSanitization(tagName, attr)) {
    return SafeHrefPropertyManager;
  }

  if (isUserInputValue(tagName, attr)) {
    return InputValuePropertyManager;
  }

  if (isOptionSelected(tagName, attr)) {
    return OptionSelectedManager;
  }

  return PropertyManager;
}

export function defaultAttributeManagers(tagName: string, attr: string) {
  if (requiresSanitization(tagName, attr)) {
    return SafeHrefAttributeManager;
  }

  return AttributeManager;
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

export const PropertyManager: PropertyManager = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    if (!isAttrRemovalValue(value)) {
      element[attr] = value;
    }
  }

  removeAttribute(env: Environment, element: Element, attr: string, namespace?: DOMNamespace) {
    // TODO this sucks but to preserve properties first and to meet current
    // semantics we must do this.
    if (namespace) {
      env.getDOM().removeAttributeNS(element, namespace, attr);
    } else {
      env.getDOM().removeAttribute(element, attr);
    }
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    if (isAttrRemovalValue(value)) {
      this.removeAttribute(env, element, attr, namespace);
    } else {
      this.setAttribute(env, element, attr, value, namespace);
    }
  }
};

function normalizeAttributeValue(value) {
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

function isAttrRemovalValue(value) {
  return value === null || value === undefined;
}

export const SafeHrefPropertyManager: AttributeManager = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque) {
    PropertyManager.setAttribute(env, element, attr, sanitizeAttributeValue(env, element, attr, value));
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    this.setAttribute(env, element, attr, value);
  }
};

export const AttributeManager: AttributeManager = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    let dom = env.getAppendOperations();
    let normalizedValue = normalizeAttributeValue(value);

    if (!isAttrRemovalValue(normalizedValue)) {
      dom.setAttribute(element, attr, normalizedValue, namespace);
    }
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    if (value === null || value === undefined || value === false) {
      if (namespace) {
        env.getDOM().removeAttributeNS(element, namespace, attr);
      } else {
        env.getDOM().removeAttribute(element, attr);
      }
    } else {
      this.setAttribute(env, element, attr, value);
    }
  }
};

function isUserInputValue(tagName: string, attribute: string) {
  return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
}

export const InputValuePropertyManager: AttributeManager = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque) {
    let input = element as FIXME<HTMLInputElement, "This breaks SSR">;
    input.value = normalizeTextValue(value);
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    let input = <HTMLInputElement>element;
    let currentValue = input.value;
    let normalizedValue = normalizeTextValue(value);
    if (currentValue !== normalizedValue) {
      input.value = normalizedValue;
    }
  }
};

function isOptionSelected(tagName: string, attribute: string) {
  return tagName === 'OPTION' && attribute === 'selected';
}

export const OptionSelectedManager: AttributeManager = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque) {
    if (value !== null && value !== undefined && value !== false) {
      let option = <HTMLOptionElement>element;
      option.selected = true;
    }
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    let option = <HTMLOptionElement>element;

    if (value) {
      option.selected = true;
    } else {
      option.selected = false;
    }
  }
};

export const SafeHrefAttributeManager: AttributeManager = new class {
  setAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    AttributeManager.setAttribute(env, element, attr, sanitizeAttributeValue(env, element, attr, value));
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    this.setAttribute(env, element, attr, value);
  }
};
