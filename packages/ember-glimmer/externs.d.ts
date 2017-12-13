declare module 'ember/features' {
  export const EMBER_MODULE_UNIFICATION: boolean | null;
  export const GLIMMER_CUSTOM_COMPONENT_MANAGER: boolean | null;
  export const EMBER_ENGINES_MOUNT_PARAMS: boolean | null;
  export const EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER: boolean | null;
  export const EMBER_GLIMMER_TEMPLATE_ONLY_COMPONENTS: boolean | null;
  export const MANDATORY_SETTER: boolean | null;
}

declare module 'ember-env-flags' {
  export const DEBUG: boolean;
}
