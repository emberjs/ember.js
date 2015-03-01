import { get } from "ember-metal/property_get";
import { isStream } from "ember-metal/streams/utils";
import BoundPartialView from "ember-views/views/bound_partial_view";
import lookupPartial from "ember-views/system/lookup_partial";

/**
@module ember
@submodule ember-htmlbars
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


  @method partial
  @for Ember.Handlebars.helpers
  @param {String} partialName the name of the template to render minus the leading underscore
*/

export function partialHelper(params, hash, options, env) {
  var view = env.data.view;
  var templateName = params[0];

  if (isStream(templateName)) {
    view.appendChild(BoundPartialView, {
      _morph: options.morph,
      _context: get(view, 'context'),
      templateNameStream: templateName,
      helperName: options.helperName || 'partial'
    });
  } else {
    var template = lookupPartial(view, templateName);
    return template.render(view, env, options.morph.contextualElement);
  }
}
