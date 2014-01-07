require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

/**
  The `partial` helper renders another template without
  changing the template context:

  ```handlebars
  {{foo}}
  {{partial "nav"}}
  ```

  The above example template will render a template named
  "_nav", which has the same context as the parent template
  it's rendered into, so if the "_nav" template also referenced
  `{{foo}}`, it would print the same thing as the `{{foo}}`
  in the above example.

  If a "_nav" template isn't found, the `partial` helper will
  fall back to a template named "nav".

  ## Bound template names

  The parameter supplied to `partial` can also be a path
  to a property containing a template name, e.g.:

  ```handlebars
  {{partial someTemplateName}}
  ```

  The above example will look up the value of `someTemplateName`
  on the template context (e.g. a controller) and use that
  value as the name of the template to render. If the resolved
  value is falsy, nothing will be rendered. If `someTemplateName`
  changes, the partial will be re-rendered using the new template
  name.

  ## Setting the partial's context with `with`

  The `partial` helper can be used in conjunction with the `with`
  helper to set a context that will be used by the partial:

  ```handlebars
  {{#with currentUser}}
    {{partial "user_info"}}
  {{/with}}
  ```

  @method partial
  @for Ember.Handlebars.helpers
  @param {String} partialName the name of the template to render minus the leading underscore
*/

Ember.Handlebars.registerHelper('partial', function partialHelper(name, options) {

  var context = (options.contexts && options.contexts.length) ? options.contexts[0] : this;

  if (options.types[0] === "ID") {
    // Helper was passed a property path; we need to
    // create a binding that will re-render whenever
    // this property changes.
    options.fn = function(context, fnOptions) {
      var partialName = Ember.Handlebars.get(context, name, fnOptions);
      renderPartial(context, partialName, fnOptions);
    };

    return Ember.Handlebars.bind.call(context, name, options, true, exists);
  } else {
    // Render the partial right into parent template.
    renderPartial(context, name, options);
  }
});

function exists(value) {
  return !Ember.isNone(value);
}

function renderPartial(context, name, options) {
  var nameParts = name.split("/"),
      lastPart = nameParts[nameParts.length - 1];

  nameParts[nameParts.length - 1] = "_" + lastPart;

  var view = options.data.view,
      underscoredName = nameParts.join("/"),
      template = view.templateForName(underscoredName),
      deprecatedTemplate = !template && view.templateForName(name);

  Ember.assert("Unable to find partial with name '"+name+"'.", template || deprecatedTemplate);

  template = template || deprecatedTemplate;

  template(context, { data: options.data });
}
