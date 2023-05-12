/**
 * A VariableResolutionContext explains how a variable name should be resolved.
 */
export type StrictResolution = 0;
export type AmbiguousAppendResolution = 1;
export type AmbiguousAppendInvokeResolution = 2;
export type AmbiguousInvokeResolution = 3;
export type ResolveAsCallHeadResolution = 5;
export type ResolveAsModifierHeadResolution = 6;
export type ResolveAsComponentHeadResolution = 7;
