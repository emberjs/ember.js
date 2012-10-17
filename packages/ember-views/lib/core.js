/**
@module ember
@submodule ember-views
*/

var jQuery = Ember.imports.jQuery;
Ember.assert("Ember Views require jQuery 1.7 or 1.8", jQuery && (jQuery().jquery.match(/^1\.(7(?!$)(?!\.[01])|8)(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = jQuery;
