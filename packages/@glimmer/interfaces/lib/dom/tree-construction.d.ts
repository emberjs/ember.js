import type { Namespace, SimpleDocumentFragment, SimpleElement, SimpleNode } from './simple';

export type NodeToken = number;

export interface NodeTokens {
  reify(token: NodeToken): SimpleNode;
}

export interface Reifiable {
  reify(tokens: NodeTokens): void;
}

export interface SpecTreeConstruction {
  openElement(name: string, ns?: Namespace): NodeToken;
  closeElement(): void;
  appendText(text: string): NodeToken;
  appendComment(text: string): NodeToken;
  setAttribute(name: string, value: string, namespace?: Namespace): void;

  appendTo(parent: SimpleElement | SimpleDocumentFragment): NodeTokens;
}
