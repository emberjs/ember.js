import { NodeToken, NodeTokensImpl } from './node-tokens';
import { HTML, OperationsBuilder, run } from './dom-operations';
import {
  Namespace,
  SimpleDocument,
  SimpleElement,
  SimpleDocumentFragment,
} from '@simple-dom/interface';

// https://github.com/whatwg/dom/issues/270

export class DOMTreeConstruction {
  private ops: number[] = [];
  private builder: OperationsBuilder;
  private token = 1;

  constructor() {
    this.builder = new OperationsBuilder(this.ops);
  }

  openElement(name: string, ns: Namespace = HTML): NodeToken {
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

  setAttribute(name: string, value: string, namespace: Namespace = HTML) {
    this.builder.setAttribute(name, value, namespace);
  }

  appendTo(parent: SimpleElement | SimpleDocumentFragment, owner: SimpleDocument): NodeTokensImpl {
    let { ops, constants } = this.builder.finish();

    return run(ops, {
      document: owner,
      parent,
      nextSibling: null,
      constants: constants,
    });
  }
}
