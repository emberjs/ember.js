require('sproutcore-handlebars/ext');

/**
  `template` allows you to render a template from inside another template.
  This allows you to re-use the same template in multiple places. For example:

      <script type="text/x-handlebars">
        {{#with loggedInUser}}
          Last Login: {{lastLogin}}
          User Info: {{template "user_info"}}
        {{/with}}
      </script>

      <script type="text/x-handlebars" data-template-name="user_info">
        Name: <em>{{name}}</em>
        Karma: <em>{{karma}}</em>
      </script>

  This helper looks for templates in the global SC.TEMPLATES hash. If you
  add <script> tags to your page with the `data-template-name` attribute set,
  they will be compiled and placed in this hash automatically.

  You can also manually register templates by adding them to the hash:

      SC.TEMPLATES["my_cool_template"] = SC.Handlebars.compile('<b>{{user}}</b>');

  @name Handlebars.helpers.template
  @param {String} templateName the template to render
*/

SC.Handlebars.registerHelper('template', function(name, options) {
  var template = SC.TEMPLATES[name];

  sc_assert("Unable to find template with name '"+name+"'.", !!template);

  SC.TEMPLATES[name](this, { data: options.data });
});
