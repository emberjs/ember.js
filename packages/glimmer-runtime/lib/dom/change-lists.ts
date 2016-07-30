import { Opaque } from 'glimmer-util';
import { DOMHelper } from './helper';
import {
  sanitizeAttributeValue,
  requiresSanitization
} from './sanitized-values';
import { normalizeProperty, normalizePropertyValue } from './props';
import { SVG_NAMESPACE } from './helper';
import { normalizeTextValue } from '../compiled/opcodes/content';

export interface IChangeList {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque, namespace?: string): void;
  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque, namespace?: string): void;
}

export function defaultChangeLists(element: Element, attr: string, isTrusting: boolean, namespace: string) {
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
  if (requiresSanitization(tagName, attr)) {
    return SafeHrefPropertyChangeList;
  }

  if (isInputValue(tagName, attr)) {
    return InputValuePropertyChangeList;
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

export const PropertyChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque, namespace?: string) {
    if (value !== null) {
      let normalized = attr.toLowerCase();
      element[normalized] = normalizePropertyValue(value);
    }
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque, namespace?: string) {
    if (value === null) {
      let normalized = attr.toLowerCase();
      element[normalized] = value;
    } else {
      this.setAttribute(...arguments);
    }
  }
};

export const AttributeChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque, namespace?: string) {
    if (value !== null && value !== undefined) {
      if (namespace) {
        dom.setAttributeNS(element, namespace, attr, normalizeTextValue(value));
      } else {
        dom.setAttribute(element, attr, normalizeTextValue(value));
      }
    }
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque, namespace?: string) {
    if (value === null) {
      if (namespace) {
        dom.removeAttributeNS(element, namespace, attr);
      } else {
        dom.removeAttribute(element, attr);
      }
    } else {
      this.setAttribute(dom, element, attr, value);
    }
  }
};

function isInputValue(tagName: string, attribute: string) {
  return tagName === 'INPUT' && attribute === 'value';
}

export const InputValuePropertyChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque) {
    let input = <HTMLInputElement>element;
    let currentValue = input.value;
    let normalizedValue = normalizeTextValue(value);
    if (currentValue !== normalizedValue) {
      input.value = normalizedValue;
    }
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque) {
    this.setAttribute(dom, element, attr, value);
  }
};

export const SafeHrefPropertyChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque) {
    PropertyChangeList.setAttribute(dom, element, attr, sanitizeAttributeValue(dom, element, attr, value));
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque) {
    this.setAttribute(dom, element, attr, value);
  }
};

export const SafeHrefAttributeChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque) {
    AttributeChangeList.setAttribute(dom, element, attr, sanitizeAttributeValue(dom, element, attr, value));
  },
  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: Opaque) {
    this.setAttribute(dom, element, attr, value);
  }
};
