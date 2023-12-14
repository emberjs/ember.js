declare module '@ember/-internals/glimmer/lib/helpers/-track-array' {
  /**
      This reference is used to get the `[]` tag of iterables, so we can trigger
      updates to `{{each}}` when it changes. It is put into place by a template
      transform at build time, similar to the (-each-in) helper
    */
  const _default: object;
  export default _default;
}
