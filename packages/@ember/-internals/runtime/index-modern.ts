/*
  The modern replacement for this package's barrel, swapped in at the build
  level for variants without the classic object model. The classic mixins are
  gone; the names `RegistryProxyMixin`/`ContainerProxyMixin` resolve to the
  plain method bags that implement the same owner API (so consumers such as
  @ember/test-helpers' mock-owner builder can keep a resolvable import and
  feature-detect the classic object model at runtime).
*/

export {
  registryProxyMethods as RegistryProxyMixin,
  containerProxyMethods as ContainerProxyMixin,
} from '@ember/engine/lib/owner-proxies';
export { contentFor as _contentFor } from './lib/mixins/-proxy-modern';
export { default as RSVP, onerrorDefault } from './lib/ext/rsvp';
