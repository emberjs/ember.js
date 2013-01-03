/**
@module ember
@submodule ember-old-router
*/

var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;

/**
Override functionality for Ember.View use in old-router

@class View
@namespace Ember
*/
Ember.View.reopen({
  templateForName: function(name, type) {
    if (!name) { return; }

    Ember.assert("templateNames are not allowed to contain periods: "+name, name.indexOf('.') === -1);

    var templates = get(this, 'templates'),
        template = get(templates, name);

    if (!template) {
      throw new Ember.Error(fmt('%@ - Unable to find %@ "%@".', [this, type, name]));
    }

    return template;
  }
});
