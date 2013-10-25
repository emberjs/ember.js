/**
@module ember
@submodule ember-views
*/

var jQuery = this.jQuery || (Ember.imports && Ember.imports.jQuery);
if (!jQuery && typeof require === 'function') {
  jQuery = require('jquery');
}

Ember.assert("Ember Views require jQuery >= 1.7", jQuery && (jQuery().jquery.match(/(^1\.[7-9]\.)|(^1\.\d{2,})|(^2\.\d+)/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = jQuery;
