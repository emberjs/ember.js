/**
@module ember
@submodule ember-views
*/

var jQuery = Ember.imports.jQuery;
Ember.assert("Ember Views require jQuery 1.8, 1.9 or 2.0", jQuery && (jQuery().jquery.match(/^((1\.(8|9))|2.0)(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = jQuery;
