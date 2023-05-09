export enum OffsetKind {
  /**
   * We have already computed the character position of this offset or span.
   */
  CharPosition = 'CharPosition',

  /**
   * This offset or span was instantiated with a Handlebars SourcePosition or SourceLocation. Its
   * character position will be computed on demand.
   */
  HbsPosition = 'HbsPosition',

  /**
   * for (rare) situations where a node is created but there was no source location (e.g. the name
   * "default" in default blocks when the word "default" never appeared in source). This is used
   * by the internals when there is a legitimate reason for the internals to synthesize a node
   * with no location.
   */
  InternalsSynthetic = 'InternalsSynthetic',
  /**
   * For situations where a node represents zero parts of the source (for example, empty arguments).
   * In general, we attempt to assign these nodes *some* position (empty arguments can be
   * positioned immediately after the callee), but it's not always possible
   */
  NonExistent = 'NonExistent',
  /**
   * For situations where a source location was expected, but it didn't correspond to the node in
   * the source. This happens if a plugin creates broken locations.
   */
  Broken = 'Broken',
}
