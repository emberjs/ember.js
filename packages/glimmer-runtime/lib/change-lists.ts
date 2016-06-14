import { DOMHelper } from './dom';
import { sanitizeAttributeValue, requiresSanitization } from './sanitized-values';

export interface IChangeList {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string): void;
  updateAttribute(dom: DOMHelper, element: Element, attr: string, value: any, namespace?: string): void;
}

export function defaultChangeLists(element: Element, attr: string) {
  let tagName = element.tagName;

  if (requiresSanitization(tagName, attr)) {
    return SafeHrefAttributeChangeList;
  }

  if (tagName === 'INPUT' && attr === 'value') {
    return NullValueAttributeChangeList;
  }

  // This needs to be generic
  return AttributeChangeList;
}

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
      this.setAttribute(element, attr, value);
    }
  }
}

function isInputValue(tagName: string, attribute: string) {
  return tagName === 'INPUT' && attribute === 'value';
}

function normalizedInputValue(value) {
  return value === null ? '' : value;
}

export const NullValueAttributeChangeList = {
  setAttribute(dom: DOMHelper, element: Element, attr: string, value: any) {
    if (isInputValue(element.tagName, attr)) {
      AttributeChangeList.setAttribute(dom, element, attr, normalizedInputValue(value));
    }
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
