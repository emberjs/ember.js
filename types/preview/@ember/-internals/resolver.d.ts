declare module '@ember/-internals/resolver' {
  /**
   * @module
   * @private This is not a public API module, and in fact ***there is no such
   *   module at runtime***. This module exists only to provide a public API for
   *   `Resolver`, which will get a dedicated home as part of Ember's public API
   *   via a future RFC. As an end user, if you need access to `Resolver` for now
   *   you should ordinarily get it via `ember-resolver`.
   */

  import EmberObject from '@ember/object';
  import type { Factory, FullName } from '@ember/owner';

  export type KnownForTypeResult<Type extends string> = {
    [fullName in `${Type}:${string}`]: boolean | undefined;
  };

  /**
   * A `Resolver` is the mechanism responsible for looking up code in your
   * application and converting its naming conventions into the actual classes,
   * functions, and templates that Ember needs to resolve its dependencies, for
   * example, what template to render for a given route. It is a system that helps
   * the app resolve the lookup of JavaScript modules agnostic of what kind of
   * module system is used, which can be AMD, CommonJS or just plain globals. It
   * is used to lookup routes, models, components, templates, or anything that is
   * used in your Ember app.
   */
  export interface Resolver extends EmberObject {
    knownForType?: <TypeName extends string>(type: TypeName) => KnownForTypeResult<TypeName>;
    lookupDescription?: (fullName: FullName) => string;
    makeToString?: (factory: Factory<object>, fullName: FullName) => string;
    normalize?: (fullName: FullName) => string;
    resolve(name: string): Factory<object> | object | undefined;
  }
}
