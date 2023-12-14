declare module '@ember/canary-features' {
  /**
      Set `EmberENV.FEATURES` in your application's `config/environment.js` file
      to enable canary features in your application.

      See the [feature flag guide](https://guides.emberjs.com/release/configuring-ember/feature-flags/)
      for more details.

      @module @ember/canary-features
      @public
    */
  export const DEFAULT_FEATURES: {};
  /**
      The hash of enabled Canary features. Add to this, any canary features
      before creating your application.

      @class FEATURES
      @static
      @since 1.1.0
      @public
    */
  export const FEATURES: {
    [feature: string]: boolean;
  };
  /**
      Determine whether the specified `feature` is enabled. Used by Ember's
      build tools to exclude experimental features from beta/stable builds.

      You can define the following configuration options:

      * `EmberENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
        enabled/disabled.

      @method isEnabled
      @param {String} feature The feature to check
      @return {Boolean}
      @since 1.1.0
      @public
    */
  export function isEnabled(feature: string): boolean;
}
