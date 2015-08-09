/**
@module ember
@submodule ember-templates
*/

import { keyword } from "htmlbars-runtime/hooks";

/**
  The `{{outlet}}` helper lets you specify where a child routes will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.hbs` file:
  ```handlebars
  {{! app/templates/application.hbs }}
  <!-- header content goes here, and will always display -->
  {{my-header}}
  <div class="my-dynamic-content">
    <!-- this content will change based on the current route, which depends on the current URL -->
    {{outlet}}
  </div>
  <!-- footer content goes here, and will always display -->
  {{my-footer}}
  ```
  See [templates guide](http://emberjs.com/guides/templates/the-application-template/) for
  additional information on using `{{outlet}}` in `application.hbs`.
  You may also specify a name for the `{{outlet}}`, which is useful when using more than one
  `{{outlet}}` in a template:
  ```handlebars
  {{outlet "menu"}}
  {{outlet "sidebar"}}
  {{outlet "main"}}
  ```
  Your routes can then render into a specific one of these `outlet`s by specifying the `outlet`
  attribute in your `renderTemplate` function:
  ```javascript
  // app/routes/menu.js
  export default Ember.Route.extend({
    renderTemplate() {
      this.render({ outlet: 'menu' });
    }
  });
  ```
  See the [routing guide](http://emberjs.com/guides/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.
  @public
  @method outlet
  @param {String} [name]
  @for Ember.Templates.helpers
  @public
*/

/*
 This level of delegation handles backward-compatibility with the
 `view` parameter to {{outlet}}. When we drop support for the `view`
 parameter in 2.0, this keyword should just get replaced directly
 with @real_outlet.
*/

export default function(morph, env, scope, params, hash, template, inverse, visitor) {
  if (hash.hasOwnProperty('view') || hash.hasOwnProperty('viewClass')) {
    Ember.deprecate("Passing `view` or `viewClass` to {{outlet}} is deprecated.");
    keyword('@customized_outlet', morph, env, scope, params, hash, template, inverse, visitor);
  } else {
    keyword('@real_outlet', morph, env, scope, params, hash, template, inverse, visitor);
  }
  return true;
}
