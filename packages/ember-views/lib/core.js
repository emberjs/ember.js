/**
@module ember
@submodule ember-views
*/

var jQuery = (this && this.jQuery) || (Ember.imports && Ember.imports.jQuery);
if (!jQuery && typeof require === 'function') {
  jQuery = require('jquery');
}

Ember.assert("Ember Views require jQuery 1.7, 1.8, 1.9, 1.10, or 2.0", jQuery && (jQuery().jquery.match(/^((1\.(7|8|9|10))|2.0)(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = jQuery;
