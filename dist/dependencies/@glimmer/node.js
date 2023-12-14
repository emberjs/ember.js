import { DOMTreeConstruction, ConcreteBounds, NewElementBuilder } from '@glimmer/runtime';
import createHTMLDocument from '@simple-dom/document';

class NodeDOMTreeConstruction extends DOMTreeConstruction {
  // Hides property on base class
  constructor(doc) {
    super(doc || createHTMLDocument());
  }

  // override to prevent usage of `this.document` until after the constructor
  setupUselessElement() {}
  insertHTMLBefore(parent, reference, html) {
    let raw = this.document.createRawHTMLSection(html);
    parent.insertBefore(raw, reference);
    return new ConcreteBounds(parent, raw, raw);
  }

  // override to avoid SVG detection/work when in node (this is not needed in SSR)
  createElement(tag) {
    return this.document.createElement(tag);
  }

  // override to avoid namespace shenanigans when in node (this is not needed in SSR)
  setAttribute(element, name, value) {
    element.setAttribute(name, value);
  }
}

const TEXT_NODE = 3;
const NEEDS_EXTRA_CLOSE = new WeakMap();
function currentNode(cursor) {
  let {
    element,
    nextSibling
  } = cursor;
  if (nextSibling === null) {
    return element.lastChild;
  } else {
    return nextSibling.previousSibling;
  }
}
class SerializeBuilder extends NewElementBuilder {
  serializeBlockDepth = 0;
  __openBlock() {
    let {
      tagName
    } = this.element;
    if (tagName !== 'TITLE' && tagName !== 'SCRIPT' && tagName !== 'STYLE') {
      let depth = this.serializeBlockDepth++;
      this.__appendComment(`%+b:${depth}%`);
    }
    super.__openBlock();
  }
  __closeBlock() {
    let {
      tagName
    } = this.element;
    super.__closeBlock();
    if (tagName !== 'TITLE' && tagName !== 'SCRIPT' && tagName !== 'STYLE') {
      let depth = --this.serializeBlockDepth;
      this.__appendComment(`%-b:${depth}%`);
    }
  }
  __appendHTML(html) {
    let {
      tagName
    } = this.element;
    if (tagName === 'TITLE' || tagName === 'SCRIPT' || tagName === 'STYLE') {
      return super.__appendHTML(html);
    }

    // Do we need to run the html tokenizer here?
    let first = this.__appendComment('%glmr%');
    if (tagName === 'TABLE') {
      let openIndex = html.indexOf('<');
      if (openIndex > -1) {
        let tr = html.slice(openIndex + 1, openIndex + 3);
        if (tr === 'tr') {
          html = `<tbody>${html}</tbody>`;
        }
      }
    }
    if (html === '') {
      this.__appendComment('% %');
    } else {
      super.__appendHTML(html);
    }
    let last = this.__appendComment('%glmr%');
    return new ConcreteBounds(this.element, first, last);
  }
  __appendText(string) {
    let {
      tagName
    } = this.element;
    let current = currentNode(this);
    if (tagName === 'TITLE' || tagName === 'SCRIPT' || tagName === 'STYLE') {
      return super.__appendText(string);
    } else if (string === '') {
      return this.__appendComment('% %');
    } else if (current && current.nodeType === TEXT_NODE) {
      this.__appendComment('%|%');
    }
    return super.__appendText(string);
  }
  closeElement() {
    if (NEEDS_EXTRA_CLOSE.has(this.element)) {
      NEEDS_EXTRA_CLOSE.delete(this.element);
      super.closeElement();
    }
    return super.closeElement();
  }
  openElement(tag) {
    if (tag === 'tr') {
      if (this.element.tagName !== 'TBODY' && this.element.tagName !== 'THEAD' && this.element.tagName !== 'TFOOT') {
        this.openElement('tbody');
        // This prevents the closeBlock comment from being re-parented
        // under the auto inserted tbody. Rehydration builder needs to
        // account for the insertion since it is injected here and not
        // really in the template.
        NEEDS_EXTRA_CLOSE.set(this.constructing, true);
        this.flushElement(null);
      }
    }
    return super.openElement(tag);
  }
  pushRemoteElement(element, cursorId, insertBefore = null) {
    let {
      dom
    } = this;
    let script = dom.createElement('script');
    script.setAttribute('glmr', cursorId);
    dom.insertBefore(element, script, insertBefore);
    return super.pushRemoteElement(element, cursorId, insertBefore);
  }
}
function serializeBuilder(env, cursor) {
  return SerializeBuilder.forInitialRender(env, cursor);
}

export { NodeDOMTreeConstruction, serializeBuilder };
