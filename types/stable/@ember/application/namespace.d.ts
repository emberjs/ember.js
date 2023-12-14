declare module '@ember/application/namespace' {
  /**
    @module @ember/application/namespace
    */
  import { findNamespace, processAllNamespaces } from '@ember/-internals/metal';
  import EmberObject from '@ember/object';
  /**
      A Namespace is an object usually used to contain other objects or methods
      such as an application or framework. Create a namespace anytime you want
      to define one of these new containers.

      # Example Usage

      ```javascript
      MyFramework = Ember.Namespace.create({
        VERSION: '1.0.0'
      });
      ```

      @class Namespace
      @extends EmberObject
      @public
    */
  class Namespace extends EmberObject {
    static NAMESPACES: import('@ember/-internals/metal/lib/namespace_search').Namespace[];
    static NAMESPACES_BY_ID: {
      [name: string]: import('@ember/-internals/metal/lib/namespace_search').Namespace;
    };
    static processAll: typeof processAllNamespaces;
    static byName: typeof findNamespace;
    isNamespace: true;
    init(properties: object | undefined): void;
    toString(): string;
    nameClasses(): void;
    destroy(): this;
  }
  export default Namespace;
}
