/**
 * A node of the reactive graph.
 *
 * `@glimmer/signals` owns the fields. Other packages use its functions.
 */
export interface Tag {
  readonly kind: number;
}

export type UpdatableTag = Tag;
export type DirtyableTag = Tag;
export type ConstantTag = Tag;
export type CombinatorTag = Tag;
