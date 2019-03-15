import * as AST from '../types/nodes';
import { VisitorKey } from '../types/visitor-keys';

export interface FullNodeTraversal<N extends AST.Node> {
  enter?(node: N): void;
  exit?(node: N): void;
  keys?: KeysVisitor<N>;
}

export type NodeHandler<N extends AST.Node> = (node: N) => void;
export type NodeTraversal<N extends AST.Node> = FullNodeTraversal<N> | NodeHandler<N>;

export type NodeVisitor = { [P in keyof AST.Nodes]?: NodeTraversal<AST.Nodes[P]> } & {
  All?: NodeTraversal<AST.Node>;
};

export interface FullKeyTraversal<N extends AST.Node, K extends string> {
  enter?(node: N, key: K): void;
  exit?(node: N, key: K): void;
}

export type KeyHandler<N extends AST.Node, K extends VisitorKey<N>> = (node: N, key: K) => void;
export type KeyTraversal<N extends AST.Node, K extends VisitorKey<N>> =
  | FullKeyTraversal<N, K>
  | KeyHandler<N, K>;

export type KeysVisitor<N extends AST.Node> = { [P in VisitorKey<N>]?: KeyTraversal<N, P> } & {
  All?: KeyTraversal<N, VisitorKey<N>>;
};
