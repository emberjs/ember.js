/**
@module ember
@submodule ember-views
*/

Ember.assert("Ember Views require jQuery 1.7 or 1.8", window.jQuery && (window.jQuery().jquery.match(/^1\.[78](\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = window.jQuery;
