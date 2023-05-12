import type {
  AmbiguousAppendInvokeResolution,
  AmbiguousAppendResolution,
  AmbiguousInvokeResolution,
  ResolveAsCallHeadResolution,
  ResolveAsComponentHeadResolution,
  ResolveAsModifierHeadResolution,
  StrictResolution,
} from '@glimmer/interfaces';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type resolution =
  | AmbiguousAppendInvokeResolution
  | AmbiguousAppendResolution
  | AmbiguousInvokeResolution
  | ResolveAsCallHeadResolution
  | ResolveAsComponentHeadResolution
  | ResolveAsModifierHeadResolution
  | StrictResolution;

export const resolution = {
  Strict: 0 satisfies StrictResolution,
  AmbiguousAppend: 1 satisfies AmbiguousAppendResolution,
  AmbiguousAppendInvoke: 2 satisfies AmbiguousAppendInvokeResolution,
  AmbiguousInvoke: 3 satisfies AmbiguousInvokeResolution,
  ResolveAsCallHead: 5 satisfies ResolveAsCallHeadResolution,
  ResolveAsModifierHead: 6 satisfies ResolveAsModifierHeadResolution,
  ResolveAsComponentHead: 7 satisfies ResolveAsComponentHeadResolution,
} as const;
