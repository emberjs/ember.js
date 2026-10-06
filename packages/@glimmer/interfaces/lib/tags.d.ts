/**
 * A node of the reactive graph.
 *
 * `@glimmer/signals` owns the fields. Other packages use its functions.
 */
export interface TagNode {
  readonly kind: number;
}

/**
 * One node, or a list of tags. A subscriber to a list subscribes to each member.
 */
export type Tag = TagNode | readonly Tag[];

export type UpdatableTag = Tag;
export type DirtyableTag = Tag;
export type ConstantTag = Tag;
export type CombinatorTag = Tag;
