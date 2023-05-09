import {
  type Namespace,
  type NodeToken,
  type SimpleDocument,
  type SimpleDocumentFragment,
  type SimpleElement,
} from '@glimmer/interfaces';
import { NS_HTML } from '@glimmer/util';

import { OperationsBuilder, run } from './dom-operations';
import { type NodeTokensImpl } from './node-tokens';

// https://github.com/whatwg/dom/issues/270

export class DOMTreeConstruction {
  private ops: number[] = [];
  private builder: OperationsBuilder;
  private token = 1;

  constructor() {
    this.builder = new OperationsBuilder(this.ops);
  }

  openElement(name: string, ns: Namespace = NS_HTML): NodeToken {
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

  setAttribute(name: string, value: string, namespace: Namespace = NS_HTML) {
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
