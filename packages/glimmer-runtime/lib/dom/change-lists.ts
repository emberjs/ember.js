import { DOMHelper } from './helper';
import {
  sanitizeAttributeValue,
  requiresSanitization
} from './sanitized-values';
import { normalizeProperty, normalizePropertyValue } from './props';
import { SVG_NAMESPACE } from './helper';

export interface IChangeList {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string): void;
  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string): void;
}

export function defaultChangeLists(element: Element, attr: string, namespace: string) {
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
    return NullValuePropertyChangeList;
  }

  return PropertyChangeList;
}

export function defaultAttributeChangeLists(tagName: string, attr: string) {
  if (requiresSanitization(tagName, attr)) {
    return SafeHrefAttributeChangeList;
  }

  if (isInputValue(tagName, attr)) {
    return NullValueAttributeChangeList;
  }

  return AttributeChangeList;
}

export const PropertyChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string) {
    if (value !== null) {
      let normalized = attr.toLowerCase();
      element[normalized] = normalizePropertyValue(value);
    }
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string) {
    if (value === null) {
      let normalized = attr.toLowerCase();
      element[normalized] = value;
    } else {
      this.setAttribute(...arguments);
    }
  }
};

export const AttributeChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string) {
    if (value !== null) {
      if (namespace) {
        dom.setAttributeNS(element, namespace, attr, value);
      } else {
        dom.setAttribute(element, attr, value);
      }
    }
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string) {
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

function normalizedInputValue(value) {
  return value === null ? '' : value;
}

export const NullValuePropertyChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    let normalized = attr.toLowerCase();
    element[normalized] = normalizedInputValue(value);
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    this.setAttribute(dom, element, attr, value);
  }
};

export const NullValueAttributeChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    AttributeChangeList.setAttribute(dom, element, attr, normalizedInputValue(value));
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    this.setAttribute(dom, element, attr, value);
  }
};

export const SafeHrefPropertyChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    PropertyChangeList.setAttribute(dom, element, attr, sanitizeAttributeValue(dom, element, attr, value));
  },

  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    this.setAttribute(dom, element, attr, value);
  }
};

export const SafeHrefAttributeChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    AttributeChangeList.setAttribute(dom, element, attr, sanitizeAttributeValue(dom, element, attr, value));
  },
  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    this.setAttribute(dom, element, attr, value);
  }
};
