import type { Bounds, SimpleDocumentFragment, SimpleNode, TreeBuilder } from '@glimmer/interfaces';

import type { NewTreeBuilder } from './element-builder';

import { ConcreteBounds } from '../bounds';

/**
 * Appending dynamic content: `{{{html}}}`, safe strings, fragments, and
 * nodes. Text has its own path on the tree builder. These were methods
 * on the builder, which kept them in every bundle.
 */
export function appendDynamicHTML(tree: TreeBuilder, value: string): void {
  let builder = tree as NewTreeBuilder;
  builder.didAppendBounds(builder.__appendHTML(value));
}

export function appendDynamicFragment(tree: TreeBuilder, value: SimpleDocumentFragment): void {
  let builder = tree as NewTreeBuilder;
  let first = value.firstChild;
  let bounds: Bounds;

  if (first) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    bounds = new ConcreteBounds(builder.element, first, value.lastChild!);
    builder.dom.insertBefore(builder.element, value, builder.nextSibling);
  } else {
    const comment = builder.__appendComment('');
    bounds = new ConcreteBounds(builder.element, comment, comment);
  }

  builder.didAppendBounds(bounds);
}

export function appendDynamicNode(tree: TreeBuilder, value: SimpleNode): void {
  let builder = tree as NewTreeBuilder;
  let node = builder.__appendNode(value);
  builder.didAppendBounds(new ConcreteBounds(builder.element, node, node));
}
