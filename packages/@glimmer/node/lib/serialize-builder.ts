import { NewElementBuilder, ElementBuilder, Bounds, ConcreteBounds, Environment } from "@glimmer/runtime";

import { Simple, Option } from "@glimmer/interfaces";

const TEXT_NODE = 3;

function currentNode(cursor: ElementBuilder | { element: Simple.Element, nextSibling: Simple.Node }): Option<Simple.Node> {
  let { element, nextSibling } = cursor;

  if (nextSibling === null) {
    return element.lastChild;
  } else {
    return nextSibling.previousSibling;
  }
}

class SerializeBuilder extends NewElementBuilder implements ElementBuilder {
  private serializeBlockDepth = 0;
  private inTable = false;

  __openBlock(): void {
    let depth = this.serializeBlockDepth++;
    this.__appendComment(`%+block:${depth}%`);

    super.__openBlock();
  }

  __closeBlock(): void {
    super.__closeBlock();
    this.__appendComment(`%-block:${--this.serializeBlockDepth}%`);
  }

  __appendHTML(html: string): Bounds {
    // Do we need to run the html tokenizer here?
    let first = this.__appendComment('%glimmer%');
    if (this.element.tagName === 'TABLE') {
      let openIndex = html.indexOf('<');
      if (openIndex > -1) {
        let tr = html.slice(openIndex + 1, openIndex + 3);
        if (tr === 'tr') {
          html = `<tbody>${html}</tbody>`;
        }
      }
    }
    super.__appendHTML(html);
    let last = this.__appendComment('%glimmer%');
    return new ConcreteBounds(this.element, first, last);
  }

  __appendText(string: string): Simple.Text {
    let current = currentNode(this);

    if (string === '') {
      return this.__appendComment('%empty%') as any as Simple.Text;
    } else if (current && current.nodeType === TEXT_NODE) {
      this.__appendComment('%sep%');
    }

    return super.__appendText(string);
  }

  closeElement() {
    if (this.element['needsExtraClose'] === true) {
      this.element['needsExtraClose'] = false;
      super.closeElement();
    }

    super.closeElement();
  }

  openElement(tag: string) {

    if (tag === 'tr') {
      if (this.element.tagName !== 'TBODY') {
        this.openElement('tbody');
        // This prevents the closeBlock comment from being re-parented
        // under the auto inserted tbody. Rehydration builder needs to
        // account for the insertion since it is injected here and not
        // really in the template.
        this.constructing!['needsExtraClose'] = true;
        this.flushElement();
      }

      this.inTable = false;
    }

    return super.openElement(tag);
  }

  pushRemoteElement(element: Simple.Element, cursorId: string,  nextSibling: Option<Simple.Node> = null) {
    let { dom } = this;
    let script = dom.createElement('script');
    script.setAttribute('glmr', cursorId);
    dom.insertBefore(element, script, nextSibling);
    super.pushRemoteElement(element, cursorId, nextSibling);
  }
}

export function serializeBuilder(env: Environment, cursor: { element: Simple.Element, nextSibling: Option<Simple.Node> }) {
  return SerializeBuilder.forInitialRender(env, cursor);
}
