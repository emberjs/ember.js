/**
@module ember
@submodule ember-views
*/

var jQuery = (this && this.jQuery) || (Ember.imports && Ember.imports.jQuery);
if (!jQuery && typeof require === 'function') {
  jQuery = require('jquery');
}

Ember.assert("Ember Views require jQuery 1.7, 1.8, 1.9, 1.10, 1.11, 2.0, or 2.1", jQuery && (jQuery().jquery.match(/^((1\.(7|8|9|10|11))|(2\.(0|1)))(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = jQuery;
