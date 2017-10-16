import { Simple } from '@glimmer/interfaces';
import { NodeToken, NodeTokens } from './node-tokens';
import { HTML, OperationsBuilder, run } from './dom-operations';

// https://github.com/whatwg/dom/issues/270

export class DOMTreeConstruction {
  private ops: number[] = [];
  private builder: OperationsBuilder;
  private token = 1;

  constructor() {
    this.builder = new OperationsBuilder(this.ops);
  }

  openElement(name: string, ns: Simple.Namespace = HTML): NodeToken {
    this.builder.openElement(name, ns);
    return this.token++;
  }

  closeElement() {
    this.builder.closeElement();
  }

  appendText(text: string) {
    this.builder.appendText(text);
    return this.token++;
  }

  appendComment(text: string) {
    this.builder.appendComment(text);
    return this.token++;
  }

  setAttribute(name: string, value: string, namespace: Simple.Namespace = HTML) {
    this.builder.setAttribute(name, value, namespace);
  }

  appendTo(parent: Simple.Element | Simple.DocumentFragment, owner: Simple.Document): NodeTokens {
    let { ops, constants } = this.builder.finish();

    return run(ops, {
      document: owner,
      parent,
      nextSibling: null,
      constants: constants
    });
  }
}