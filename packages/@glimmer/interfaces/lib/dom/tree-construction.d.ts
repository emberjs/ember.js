import * as Simple from './simple';
import { Namespace } from '@simple-dom/interface';

export type NodeToken = number;

export interface NodeTokens {
  reify(token: NodeToken): Simple.Node;
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
