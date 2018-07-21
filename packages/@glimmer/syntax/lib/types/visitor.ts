import {
  Node,
  Nodes,
  ParentNode,
  ParentNodeType,
  LeafNode,
  LeafNodeType,
  ChildKey,
  ChildKeyByNodeType,
  NodeByChildKey,
} from './nodes';

export type NodeFunction<T extends Node = Node> = (
  node: T
) => Node | Node[] | undefined | null | void;

export type KeyFunction<T extends ParentNode = ParentNode, K extends ChildKey = ChildKey> = (
  node: T,
  key: K
) => void;

export type FunctionOrEnterExit<F extends Function, K = undefined> = F | EnterExit<F, K>;

export interface EnterExit<F extends Function, K = undefined> {
  enter?: F;
  exit?: F;
  keys?: K;
}

export type KeyHandler<
  T extends ParentNode = ParentNode,
  K extends ChildKey = ChildKey
> = FunctionOrEnterExit<KeyFunction<T, K>>;

export type KeysVisistor<
  T extends ParentNode,
  K extends ChildKey = ChildKeyByNodeType[T['type']]
> = {
  All?: KeyHandler<T, K>;
} & { [P in K]?: KeyHandler<Extract<T, NodeByChildKey[P]>, P> };

// backwards compat
export type EnterExitNodeHandler<T extends Node> = EnterExit<NodeFunction<T>, any>;
export { NodeFunction as NodeHandlerFunction };

export type NodeHandler<
  T extends Node = Node,
  K = KeysVisistor<ParentNode, ChildKey>
> = FunctionOrEnterExit<NodeFunction<T>, K>;
export type LeafNodeHandler<T extends LeafNode> = NodeHandler<T, undefined>;
export type ParentNodeHandler<T extends ParentNode> = NodeHandler<T, KeysVisistor<T>>;

export type NodeVisitor = {
  All?: NodeHandler;
} & { [T in LeafNodeType]?: LeafNodeHandler<Nodes[T]> } &
  { [T in ParentNodeType]?: ParentNodeHandler<Nodes[T]> };
