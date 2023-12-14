declare module '@ember/-internals/glimmer/lib/utils/debug-render-message' {
  let debugRenderMessage: undefined | ((renderingStack: string) => string);
  export default debugRenderMessage;
}
