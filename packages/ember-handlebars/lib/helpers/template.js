require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
@deprecated use [/api/classes/Ember.Handlebars.helpers.html#method_partial](partial)
  instead, which will work the same way.
*/

/**
  `template` allows you to render a template from inside another template.
  This allows you to re-use the same template in multiple places. For example:

  ```html
  <script type="text/x-handlebars" data-template-name="logged_in_user">
    {{#with loggedInUser}}
      Last Login: {{lastLogin}}
      User Info: {{template "user_info"}}
    {{/with}}
  </script>
  ```

  ```html
  <script type="text/x-handlebars" data-template-name="user_info">
    Name: <em>{{name}}</em>
    Karma: <em>{{karma}}</em>
  </script>
  ```

  ```handlebars
  {{#if isUser}}
    {{template "user_info"}}
  {{else}}
    {{template "unlogged_user_info"}}
  {{/if}}
  ```

  This helper looks for templates in the global `Ember.TEMPLATES` hash. If you
  add `<script>` tags to your page with the `data-template-name` attribute set,
  they will be compiled and placed in this hash automatically.

  You can also manually register templates by adding them to the hash:

  ```javascript
  Ember.TEMPLATES["my_cool_template"] = Ember.Handlebars.compile('<b>{{user}}</b>');
  ```

  @deprecated
  @method template
  @for Ember.Handlebars.helpers
  @param {String} templateName the template to render
*/

Ember.Handlebars.registerHelper('template', function(name, options) {
  Ember.deprecate("The `template` helper has been deprecated in favor of the `partial` helper. Please use `partial` instead, which will work the same way.");
  return Ember.Handlebars.helpers.partial.apply(this, arguments);
});
