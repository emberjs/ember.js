declare module '@ember/-internals/views/lib/component_lookup' {
  import type { InternalOwner, RegisterOptions } from '@ember/-internals/owner';
  import EmberObject from '@ember/object';
  const _default: Readonly<typeof EmberObject> &
    (new (owner?: import('@ember/-internals/owner').default | undefined) => EmberObject) & {
      componentFor(
        name: string,
        owner: InternalOwner
      ): import('@ember/-internals/owner').FactoryManager<object> | undefined;
      layoutFor(name: string, owner: InternalOwner, options: RegisterOptions): unknown;
    };
  export default _default;
}
