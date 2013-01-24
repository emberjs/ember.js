require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

/**
  `loc` looks up the string in the localized strings hash.
  This is a convenient way to localize text. For example:

  ```html
  <script type="text/x-handlebars" data-template-name="home">
    {{loc welcome}}
  </script>
  ```

  @method loc
  @for Ember.Handlebars.helpers
  @param {String} str The string to format
*/

Ember.Handlebars.registerHelper('loc', function(str) {
  return Ember.String.loc(str);
});
