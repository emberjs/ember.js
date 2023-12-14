declare module '@ember/-internals/runtime' {
  export { default as RegistryProxyMixin } from '@ember/-internals/runtime/lib/mixins/registry_proxy';
  export { default as ContainerProxyMixin } from '@ember/-internals/runtime/lib/mixins/container_proxy';
  export { default as Comparable } from '@ember/-internals/runtime/lib/mixins/comparable';
  export { default as ActionHandler } from '@ember/-internals/runtime/lib/mixins/action_handler';
  export {
    default as _ProxyMixin,
    contentFor as _contentFor,
  } from '@ember/-internals/runtime/lib/mixins/-proxy';
  export { default as MutableEnumerable } from '@ember/enumerable/mutable';
  export { default as TargetActionSupport } from '@ember/-internals/runtime/lib/mixins/target_action_support';
  export { default as RSVP, onerrorDefault } from '@ember/-internals/runtime/lib/ext/rsvp';
}
