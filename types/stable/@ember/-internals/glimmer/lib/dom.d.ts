declare module '@ember/-internals/glimmer/lib/dom' {
  export {
    DOMChanges,
    DOMTreeConstruction,
    clientBuilder,
    rehydrationBuilder,
  } from '@glimmer/runtime';
  export { NodeDOMTreeConstruction, serializeBuilder } from '@glimmer/node';
}
