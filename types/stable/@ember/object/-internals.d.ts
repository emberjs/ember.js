declare module '@ember/object/-internals' {
  export { getCachedValueFor as cacheFor } from '@ember/-internals/metal';
  export { guidFor } from '@ember/-internals/utils';
  import EmberObject from '@ember/object';
  interface FrameworkObject extends EmberObject {}
  let FrameworkObject: typeof EmberObject;
  export { FrameworkObject };
}
