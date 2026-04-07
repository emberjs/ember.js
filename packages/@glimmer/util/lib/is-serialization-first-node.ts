import type { SimpleNode } from '@glimmer/interfaces';

export const SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';

export function isSerializationFirstNode(node: SimpleNode): boolean {
  return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
}
