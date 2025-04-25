declare const TYPE: unique symbol;
export type TagTypeSymbol = typeof TYPE;

declare const COMPUTE: unique symbol;
export type TagComputeSymbol = typeof COMPUTE;

export type DIRTYABLE_TAG_ID = 0;
export type UPDATABLE_TAG_ID = 1;
export type COMBINATOR_TAG_ID = 2;
export type CONSTANT_TAG_ID = 3;

/**
 * This union represents all of the possible tag types for the monomorphic tag class.
 * Other custom tag classes can exist, such as CurrentTag and VolatileTag, but for
 * performance reasons, any type of tag that is meant to be used frequently should
 * be added to the monomorphic tag.
 */
export type MonomorphicTagId =
  | DIRTYABLE_TAG_ID
  | UPDATABLE_TAG_ID
  | COMBINATOR_TAG_ID
  | CONSTANT_TAG_ID;

export type VOLATILE_TAG_ID = 100;
export type CURRENT_TAG_ID = 101;

export type PolymorphicTagId = VOLATILE_TAG_ID | CURRENT_TAG_ID;

export type TagId = MonomorphicTagId | PolymorphicTagId;

export type Revision = number;

export interface Tag {
  readonly [TYPE]: TagId;
  readonly subtag?: Tag | Tag[] | null | undefined;
  [COMPUTE](): Revision;
}

export interface MonomorphicTag extends Tag {
  readonly [TYPE]: MonomorphicTagId;
}

export interface UpdatableTag extends MonomorphicTag {
  readonly [TYPE]: UPDATABLE_TAG_ID;
}

export interface DirtyableTag extends MonomorphicTag {
  readonly [TYPE]: DIRTYABLE_TAG_ID;
}

export interface ConstantTag extends MonomorphicTag {
  readonly [TYPE]: CONSTANT_TAG_ID;
}

export interface CombinatorTag extends MonomorphicTag {
  readonly [TYPE]: COMBINATOR_TAG_ID;
}
