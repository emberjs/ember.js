/// ResolutionType ///

export type VALUE_RESOLUTION = 'value';
export const VALUE_RESOLUTION: VALUE_RESOLUTION = 'value';

export type COMPONENT_RESOLUTION = 'component';
export const COMPONENT_RESOLUTION: COMPONENT_RESOLUTION = 'component';

export type HELPER_RESOLUTION = 'helper';
export const HELPER_RESOLUTION: HELPER_RESOLUTION = 'helper';

export type MODIFIER_RESOLUTION = 'modifier';
export const MODIFIER_RESOLUTION: MODIFIER_RESOLUTION = 'modifier';

export type COMPONENT_OR_HELPER_RESOLUTION = 'component or helper';
export const COMPONENT_OR_HELPER_RESOLUTION: COMPONENT_OR_HELPER_RESOLUTION = 'component or helper';

export type ResolutionType =
  | VALUE_RESOLUTION
  | COMPONENT_RESOLUTION
  | HELPER_RESOLUTION
  | MODIFIER_RESOLUTION
  | COMPONENT_OR_HELPER_RESOLUTION;
