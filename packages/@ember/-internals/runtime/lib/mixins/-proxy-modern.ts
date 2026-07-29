/*
  Build-level replacement for the ProxyMixin module in variants without the
  classic object model. Proxies do not exist there, so `contentFor` (used by
  the {{each-in}} helper behind an `isProxy` check) is never reached.
*/

export function contentFor(_proxy: unknown): unknown {
  return null;
}

export default null;
