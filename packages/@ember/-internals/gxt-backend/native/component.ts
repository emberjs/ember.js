// gxt NATIVE layer — alias target for the `@ember/component` BARREL (exact
// specifier only; `@ember/component/helper` and `/template-only` stay classic).
//
// Why a native barrel: `@glimmer/component` imports `setComponentManager` and
// `capabilities` from `@ember/component`, and the classic barrel's default
// export drags the whole classic Component / CoreView / curly manager /
// TargetActionSupport subtree into every app. Editing the shared
// `@glimmer/component` source would also change the classic build, so the cut
// happens here. Same export names as the classic barrel, plus `templateOnly`.
export { setComponentTemplate, getComponentTemplate } from './manager-api';
export { componentCapabilities as capabilities } from './manager-api';
export { setComponentManager } from '@ember/-internals/glimmer/lib/utils/managers';
export { templateOnlyComponent as templateOnly } from './template-only';
export { default } from './stubs/component';
export { default as Input } from './stubs/input';
export { default as Textarea } from './stubs/textarea';
