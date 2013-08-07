require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

/**
  `loc` looks up the string in the localized strings hash.
  This is a convenient way to localize text. For example:
  
  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    welcomeMessage: '_Hello World'
  });

  Ember.STRINGS = {
    '_Hello World': 'Bonjour le monde',
  };
  ```

  ```handlebars
  <span>{{loc welcomeMessage}}<span>
  ```
  
  ```html
  <span>Bonjour le monde</span>
  ```

  @method loc
  @for Ember.Handlebars.helpers
  @param {String} str The string to format
*/

Ember.Handlebars.registerHelper('loc', function(str) {
  return Ember.String.loc(str);
});
