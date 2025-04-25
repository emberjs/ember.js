import type {
  ResolveAsComponentHeadResolution,
  ResolveAsComponentOrHelperHeadResolution,
  ResolveAsHelperHeadResolution,
  ResolveAsModifierHeadResolution,
  StrictResolution,
} from '@glimmer/interfaces';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type resolution =
  | ResolveAsComponentOrHelperHeadResolution
  | ResolveAsHelperHeadResolution
  | ResolveAsComponentHeadResolution
  | ResolveAsModifierHeadResolution
  | StrictResolution;

export const resolution = {
  Strict: 0 satisfies StrictResolution,
  ResolveAsComponentOrHelperHead: 1 satisfies ResolveAsComponentOrHelperHeadResolution,
  ResolveAsHelperHead: 5 satisfies ResolveAsHelperHeadResolution,
  ResolveAsModifierHead: 6 satisfies ResolveAsModifierHeadResolution,
  ResolveAsComponentHead: 7 satisfies ResolveAsComponentHeadResolution,
} as const;
