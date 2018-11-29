import { Simple } from '@glimmer/interfaces';
import { Namespace } from '@simple-dom/interface';

export type NodeToken = number;

export interface NodeTokens {
  reify<N extends Simple.Node>(token: NodeToken): N;
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

  appendTo(parent: Simple.Element | Simple.DocumentFragment): NodeTokens;
}
