/**
@module ember
@submodule ember-views
*/

var jQuery = (this && this.jQuery) || (Ember.imports && Ember.imports.jQuery);
if (!jQuery && typeof require === 'function') {
  jQuery = require('jquery');
}

Ember.assert("Ember Views requires jQuery between versions 1.7 and 2.1", jQuery && (jQuery().jquery.match(/^((1\.([7-11]))|(2\.([0-1])))(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = jQuery;
