declare module '@ember/-internals/container' {
  export {
    default as Registry,
    type ResolverClass,
    privatize,
  } from '@ember/-internals/container/lib/registry';
  export {
    default as Container,
    getFactoryFor,
    setFactoryFor,
    INIT_FACTORY,
  } from '@ember/-internals/container/lib/container';
}
