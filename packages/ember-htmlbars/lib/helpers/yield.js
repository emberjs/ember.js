/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";

import { get } from "ember-metal/property_get";

/**
  `{{yield}}` denotes an area of a template that will be rendered inside
  of another template. It has two main uses:

  ### Use with `layout`
  When used in a Handlebars template that is assigned to an `Ember.View`
  instance's `layout` property Ember will render the layout template first,
  inserting the view's own rendered output at the `{{yield}}` location.

  An empty `<body>` and the following application code:

  ```javascript
  AView = Ember.View.extend({
    classNames: ['a-view-with-layout'],
    layout: Ember.Handlebars.compile('<div class="wrapper">{{yield}}</div>'),
    template: Ember.Handlebars.compile('<span>I am wrapped</span>')
  });

  aView = AView.create();
  aView.appendTo('body');
  ```

  Will result in the following HTML output:

  ```html
  <body>
    <div class='ember-view a-view-with-layout'>
      <div class="wrapper">
        <span>I am wrapped</span>
      </div>
    </div>
  </body>
  ```

  The `yield` helper cannot be used outside of a template assigned to an
  `Ember.View`'s `layout` property and will throw an error if attempted.

  ```javascript
  BView = Ember.View.extend({
    classNames: ['a-view-with-layout'],
    template: Ember.Handlebars.compile('{{yield}}')
  });

  bView = BView.create();
  bView.appendTo('body');

  // throws
  // Uncaught Error: assertion failed:
  // You called yield in a template that was not a layout
  ```

  ### Use with Ember.Component
  When designing components `{{yield}}` is used to denote where, inside the component's
  template, an optional block passed to the component should render:

  ```handlebars
  <!-- application.hbs -->
  {{#labeled-textfield value=someProperty}}
    First name:
  {{/labeled-textfield}}
  ```

  ```handlebars
  <!-- components/labeled-textfield.hbs -->
  <label>
    {{yield}} {{input value=value}}
  </label>
  ```

  Result:

  ```html
  <label>
    First name: <input type="text" />
  </label>
  ```

  @method yield
  @for Ember.Handlebars.helpers
  @param {Hash} options
  @return {String} HTML string
*/
export function yieldHelper(params, hash, options, env) {
  var view = this;

  // Yea gods
  while (view && !get(view, 'layout')) {
    if (view._contextView) {
      view = view._contextView;
    } else {
      view = get(view, '_parentView');
    }
  }

  Ember.assert("You called yield in a template that was not a layout", !!view);

  return view._yield(this, env, options.morph, params);
}
