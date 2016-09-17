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

export interface IChangeList {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque, namespace?: string): void;
  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: string): void;
}

export function defaultChangeLists(element: Simple.Element, attr: string, isTrusting: boolean, namespace: string) {
  let tagName = element.tagName;
  let isSVG = element.namespaceURI === SVG_NAMESPACE;

  if (isSVG) {
    return defaultAttributeChangeLists(tagName, attr);
  }

  let { type } = normalizeProperty(element, attr);

  if (type === 'attr') {
    return defaultAttributeChangeLists(tagName, attr);
  } else {
    return defaultPropertyChangeLists(tagName, attr);
  }
}

export function defaultPropertyChangeLists(tagName: string, attr: string) {
  if (attr === 'disabled' || attr === 'checked') {
    return BooleanPropertyChangeList;
  }

  if (requiresSanitization(tagName, attr)) {
    return SafeHrefPropertyChangeList;
  }

  if (isUserInputValue(tagName, attr)) {
    return InputValuePropertyChangeList;
  }

  if (isOptionSelected(tagName, attr)) {
    return OptionSelectedChangeList;
  }

  return PropertyChangeList;
}

export function defaultAttributeChangeLists(tagName: string, attr: string) {
  if (requiresSanitization(tagName, attr)) {
    return SafeHrefAttributeChangeList;
  }

  return AttributeChangeList;
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

export const PropertyChangeList: IChangeList = {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    if (value !== null && value !== undefined) {
      let normalized = attr.toLowerCase();
      element[normalized] = value;
    }
  },

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    if (value === null || value === undefined) {
      // TODO this sucks but to preserve properties first and to meet current
      // semantics we must do this.
      if (namespace) {
        env.getDOM().removeAttributeNS(element, namespace, attr);
      } else {
        env.getDOM().removeAttribute(element, attr);
      }
    } else {
      this.setAttribute(...arguments);
    }
  }
};

export const SafeHrefPropertyChangeList: IChangeList = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque) {
    let tree = env.getAppendOperations();
    PropertyChangeList.setAttribute(env, element, attr, sanitizeAttributeValue(env, element, attr, value));
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    this.setAttribute(env, element, attr, value);
  }
};

export const BooleanPropertyChangeList: IChangeList = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque) {
    if (value !== false ) {
      AttributeChangeList.setAttribute(env, element, attr, value);
    }
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    if (value === false || value === null || value === undefined) {
      PropertyChangeList.updateAttribute(env, element, attr, null);
    } else {
      this.setAttribute(env, element, attr, value);
    }
  }
};

export const AttributeChangeList: IChangeList = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    let dom = env.getAppendOperations();

    if (value !== null && value !== undefined) {
      dom.setAttribute(element, attr, normalizeTextValue(value), namespace);
    }
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque, namespace?: DOMNamespace) {
    if (value === null || value === undefined) {
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

export const InputValuePropertyChangeList: IChangeList = new class {
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

export const OptionSelectedChangeList: IChangeList = new class {
  setAttribute(env: Environment, element: Simple.Element, attr: string, value: Opaque) {
    if (value !== null && value !== undefined && value !== false) {
      env.getAppendOperations().setAttribute(element, 'selected', '');
    }
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    let option = <HTMLOptionElement>element;

    if (value === null || value === undefined || value === false) {
      option.selected = false;
    } else {
      option.selected = true;
    }
  }
};

export const SafeHrefAttributeChangeList: IChangeList = new class {
  setAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    AttributeChangeList.setAttribute(env, element, attr, sanitizeAttributeValue(env, element, attr, value));
  }

  updateAttribute(env: Environment, element: Element, attr: string, value: Opaque) {
    this.setAttribute(env, element, attr, value);
  }
};
