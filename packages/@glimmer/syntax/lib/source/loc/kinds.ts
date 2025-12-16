/**
 * We have already computed the character position of this offset or span.
 */
export type CharOffsetKind = 'CharPosition';
export const CHAR_OFFSET_KIND: CharOffsetKind = 'CharPosition';
/**
 * This offset or span was instantiated with a Handlebars SourcePosition or SourceLocation. Its
 * character position will be computed on demand.
 */
export type HbsPositionKind = 'HbsPosition';
export const HBS_POSITION_KIND: HbsPositionKind = 'HbsPosition';
/**
 * for (rare) situations where a node is created but there was no source location (e.g. the name
 * "default" in default blocks when the word "default" never appeared in source). This is used
 * by the internals when there is a legitimate reason for the internals to synthesize a node
 * with no location.
 */
export type InternalSyntheticKind = 'InternalsSynthetic';
export const INTERNAL_SYNTHETIC_KIND: InternalSyntheticKind = 'InternalsSynthetic';

/**
 * For situations where a node represents zero parts of the source (for example, empty arguments).
 * In general, we attempt to assign these nodes *some* position (empty arguments can be
 * positioned immediately after the callee), but it's not always possible
 */
export type NonExistentKind = 'NonExistent';
export const NON_EXISTENT_KIND: NonExistentKind = 'NonExistent';

/**
 * For situations where a source location was expected, but it didn't correspond to the node in
 * the source. This happens if a plugin creates broken locations.
 */
export type BrokenKind = 'Broken';
export const BROKEN_KIND: BrokenKind = 'Broken';

export type OffsetKind = CharOffsetKind | HbsPositionKind | InvisibleKind;

/**
 * These kinds  describe spans that don't have a concrete location in the original source.
 */
export type InvisibleKind = BrokenKind | InternalSyntheticKind | NonExistentKind;

export function isInvisible(kind: OffsetKind): kind is InvisibleKind {
  return kind !== CHAR_OFFSET_KIND && kind !== HBS_POSITION_KIND;
}
