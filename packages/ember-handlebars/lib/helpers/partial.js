require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

/**
  `partial` renders a template directly using the current context.
  If needed the context can be set using the `{{#with foo}}` helper. 

  ```html
  <script type="text/x-handlebars" data-template-name="header_bar">
    {{#with currentUser}}
      {{partial user_info}}
    {{/with}}
  </script>

  The `data-template-name` attribute of a partial template
  is prefixed with an underscore.

  ```html
  <script type="text/x-handlebars" data-template-name="_user_info">
    <span>Hello {{username}}!</span>
  </script>
  ```

  @method partial
  @for Ember.Handlebars.helpers
  @param {String} partialName the name of the template to render minus the leading underscore
*/

Ember.Handlebars.registerHelper('partial', function(name, options) {
  var nameParts = name.split("/"),
      lastPart = nameParts[nameParts.length - 1];

  nameParts[nameParts.length - 1] = "_" + lastPart;

  var underscoredName = nameParts.join("/");

  var template = Ember.TEMPLATES[underscoredName],
      deprecatedTemplate = Ember.TEMPLATES[name];

  Ember.deprecate("You tried to render the partial " + name + ", which should be at '" + underscoredName + "', but Ember found '" + name + "'. Please use a leading underscore in your partials", template);
  Ember.assert("Unable to find partial with name '"+name+"'.", template || deprecatedTemplate);

  template = template || deprecatedTemplate;

  template(this, { data: options.data });
});
