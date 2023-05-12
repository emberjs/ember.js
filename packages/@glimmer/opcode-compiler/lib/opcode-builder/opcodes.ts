import type {
  HighLevelEnd,
  HighLevelLabel,
  HighLevelResolveComponent,
  HighLevelResolveComponentOrHelper,
  HighLevelResolveFree,
  HighLevelResolveHelper,
  HighLevelResolveLocal,
  HighLevelResolveModifier,
  HighLevelResolveOptionalComponentOrHelper,
  HighLevelResolveOptionalHelper,
  HighLevelResolveTemplateLocal,
  HighLevelStart,
  HighLevelStartLabels,
  HighLevelStopLabels,
} from "@glimmer/interfaces";

export const HighLevelResolutionOpcodes = {
  Modifier: 1003 satisfies HighLevelResolveModifier,
  Component: 1004 satisfies HighLevelResolveComponent,
  Helper: 1005 satisfies HighLevelResolveHelper,
  OptionalHelper: 1006 satisfies HighLevelResolveOptionalHelper,
  ComponentOrHelper: 1007 satisfies HighLevelResolveComponentOrHelper,
  OptionalComponentOrHelper: 1008 satisfies HighLevelResolveOptionalComponentOrHelper,
  Free: 1009 satisfies HighLevelResolveFree,
  Local: 1010 satisfies HighLevelResolveLocal,
  TemplateLocal: 1011 satisfies HighLevelResolveTemplateLocal,
} as const;

export const HighLevelBuilderOpcodes = {
  Label: 1000 satisfies HighLevelLabel,
  StartLabels: 1001 satisfies HighLevelStartLabels,
  StopLabels: 1002 satisfies HighLevelStopLabels,
  Start: 1000 satisfies HighLevelStart,
  End: 1002 satisfies HighLevelEnd,
} as const;
