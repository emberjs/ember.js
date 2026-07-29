/*
  The modern replacement for the `@ember/component` entrypoint, swapped in at
  the build level for variants without classic components. The classic
  `Component` default export is gone; the template/manager association APIs
  and the (InternalComponent-based, not classic) `Input`/`Textarea` built-ins
  remain.
*/

export { setComponentTemplate, getComponentTemplate } from '@glimmer/manager/lib/public/template';

export { default as Input } from '@ember/-internals/glimmer/lib/components/input';
export { default as Textarea } from '@ember/-internals/glimmer/lib/components/textarea';
export { componentCapabilities as capabilities } from '@glimmer/manager/lib/public/component';
export { setComponentManager } from '@ember/-internals/glimmer/lib/utils/managers';
