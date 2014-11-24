/**
@module ember
@submodule ember-routing-handlebars
*/

import Ember from "ember-metal/core"; // assert
import ControllerMixin from "ember-runtime/mixins/controller";
import { viewHelper } from "ember-handlebars/helpers/view";
import { stringifyValue } from "ember-handlebars/ext";
import { LinkView } from "ember-routing-views/views/link";

import 'ember-handlebars';

var slice = [].slice;

/**
  The `{{link-to}}` helper renders a link to the supplied
  `routeName` passing an optionally supplied model to the
  route as its `model` context of the route. The block
  for `{{link-to}}` becomes the innerHTML of the rendered
  element:

  ```handlebars
  {{#link-to 'photoGallery'}}
    Great Hamster Photos
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos">
    Great Hamster Photos
  </a>
  ```

  ### Supplying a tagName
  By default `{{link-to}}` renders an `<a>` element. This can
  be overridden for a single use of `{{link-to}}` by supplying
  a `tagName` option:

  ```handlebars
  {{#link-to 'photoGallery' tagName="li"}}
    Great Hamster Photos
  {{/link-to}}
  ```

  ```html
  <li>
    Great Hamster Photos
  </li>
  ```

  To override this option for your entire application, see
  "Overriding Application-wide Defaults".

  ### Disabling the `link-to` helper
  By default `{{link-to}}` is enabled.
  any passed value to `disabled` helper property will disable the `link-to` helper.

  static use: the `disabled` option:

  ```handlebars
  {{#link-to 'photoGallery' disabled=true}}
    Great Hamster Photos
  {{/link-to}}
  ```

  dynamic use: the `disabledWhen` option:

  ```handlebars
  {{#link-to 'photoGallery' disabledWhen=controller.someProperty}}
    Great Hamster Photos
  {{/link-to}}
  ```

  any passed value to `disabled` will disable it except `undefined`.
  to ensure that only `true` disable the `link-to` helper you can
  override the global behaviour of `Ember.LinkView`.

  ```javascript
  Ember.LinkView.reopen({
    disabled: Ember.computed(function(key, value) {
      if (value !== undefined) {
        this.set('_isDisabled', value === true);
      }
      return value === true ? get(this, 'disabledClass') : false;
    })
  });
  ```

  see "Overriding Application-wide Defaults" for more.

  ### Handling `href`
  `{{link-to}}` will use your application's Router to
  fill the element's `href` property with a url that
  matches the path to the supplied `routeName` for your
  routers's configured `Location` scheme, which defaults
  to Ember.HashLocation.

  ### Handling current route
  `{{link-to}}` will apply a CSS class name of 'active'
  when the application's current route matches
  the supplied routeName. For example, if the application's
  current route is 'photoGallery.recent' the following
  use of `{{link-to}}`:

  ```handlebars
  {{#link-to 'photoGallery.recent'}}
    Great Hamster Photos from the last week
  {{/link-to}}
  ```

  will result in

  ```html
  <a href="/hamster-photos/this-week" class="active">
    Great Hamster Photos
  </a>
  ```

  The CSS class name used for active classes can be customized
  for a single use of `{{link-to}}` by passing an `activeClass`
  option:

  ```handlebars
  {{#link-to 'photoGallery.recent' activeClass="current-url"}}
    Great Hamster Photos from the last week
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/this-week" class="current-url">
    Great Hamster Photos
  </a>
  ```

  To override this option for your entire application, see
  "Overriding Application-wide Defaults".

  ### Supplying a model
  An optional model argument can be used for routes whose
  paths contain dynamic segments. This argument will become
  the model context of the linked route:

  ```javascript
  App.Router.map(function() {
    this.resource("photoGallery", {path: "hamster-photos/:photo_id"});
  });
  ```

  ```handlebars
  {{#link-to 'photoGallery' aPhoto}}
    {{aPhoto.title}}
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/42">
    Tomster
  </a>
  ```

  ### Supplying multiple models
  For deep-linking to route paths that contain multiple
  dynamic segments, multiple model arguments can be used.
  As the router transitions through the route path, each
  supplied model argument will become the context for the
  route with the dynamic segments:

  ```javascript
  App.Router.map(function() {
    this.resource("photoGallery", {path: "hamster-photos/:photo_id"}, function() {
      this.route("comment", {path: "comments/:comment_id"});
    });
  });
  ```
  This argument will become the model context of the linked route:

  ```handlebars
  {{#link-to 'photoGallery.comment' aPhoto comment}}
    {{comment.body}}
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/42/comment/718">
    A+++ would snuggle again.
  </a>
  ```

  ### Supplying an explicit dynamic segment value
  If you don't have a model object available to pass to `{{link-to}}`,
  an optional string or integer argument can be passed for routes whose
  paths contain dynamic segments. This argument will become the value
  of the dynamic segment:

  ```javascript
  App.Router.map(function() {
    this.resource("photoGallery", {path: "hamster-photos/:photo_id"});
  });
  ```

  ```handlebars
  {{#link-to 'photoGallery' aPhotoId}}
    {{aPhoto.title}}
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/42">
    Tomster
  </a>
  ```

  When transitioning into the linked route, the `model` hook will
  be triggered with parameters including this passed identifier.

  ### Allowing Default Action

 By default the `{{link-to}}` helper prevents the default browser action
 by calling `preventDefault()` as this sort of action bubbling is normally
 handled internally and we do not want to take the browser to a new URL (for
 example).

 If you need to override this behavior specify `preventDefault=false` in
 your template:

  ```handlebars
  {{#link-to 'photoGallery' aPhotoId preventDefault=false}}
    {{aPhotoId.title}}
  {{/link-to}}
  ```

  ### Overriding attributes
  You can override any given property of the Ember.LinkView
  that is generated by the `{{link-to}}` helper by passing
  key/value pairs, like so:

  ```handlebars
  {{#link-to  aPhoto tagName='li' title='Following this link will change your life' classNames='pic sweet'}}
    Uh-mazing!
  {{/link-to}}
  ```

  See [Ember.LinkView](/api/classes/Ember.LinkView.html) for a
  complete list of overrideable properties. Be sure to also
  check out inherited properties of `LinkView`.

  ### Overriding Application-wide Defaults
  ``{{link-to}}`` creates an instance of Ember.LinkView
  for rendering. To override options for your entire
  application, reopen Ember.LinkView and supply the
  desired values:

  ``` javascript
  Ember.LinkView.reopen({
    activeClass: "is-active",
    tagName: 'li'
  })
  ```

  It is also possible to override the default event in
  this manner:

  ``` javascript
  Ember.LinkView.reopen({
    eventName: 'customEventName'
  });
  ```

  @method link-to
  @for Ember.Handlebars.helpers
  @param {String} routeName
  @param {Object} [context]*
  @param [options] {Object} Handlebars key/value pairs of options, you can override any property of Ember.LinkView
  @return {String} HTML string
  @see {Ember.LinkView}
*/
function linkToHelper(name) {
  var options = slice.call(arguments, -1)[0];
  var params = slice.call(arguments, 0, -1);
  var view = options.data.view;
  var hash = options.hash;
  var hashTypes = options.hashTypes;
  var types = options.types;
  var shouldEscape = !hash.unescaped;
  var queryParamsObject;

  Ember.assert("You must provide one or more parameters to the link-to helper.", params.length);

  var lastParam = params[params.length - 1];

  if (lastParam && lastParam.isQueryParams) {
    hash.queryParamsObject = queryParamsObject = params.pop();
  }

  if (hash.disabledWhen) {
    hash.disabledBinding = hash.disabledWhen;
    hashTypes.disabledBinding = hashTypes.disabledWhen;
    delete hash.disabledWhen;
    delete hashTypes.disabledWhen;
  }

  if (!options.fn) {
    var linkTitle = params.shift();
    var linkTitleType = types.shift();
    if (linkTitleType === 'ID') {
      hash.linkTitle = linkTitle = view.getStream(linkTitle);
      options.fn = function() {
        return stringifyValue(linkTitle.value(), shouldEscape);
      };
    } else {
      options.fn = function() {
        return linkTitle;
      };
    }
  }

  // Setup route & param streams
  for (var i = 0; i < params.length; i++) {
    var paramPath = params[i];
    if (types[i] === 'ID') {
      var lazyValue = view.getStream(paramPath);

      // TODO: Consider a better approach to unwrapping controllers.
      if (paramPath !== 'controller') {
        while (ControllerMixin.detect(lazyValue.value())) {
          paramPath = (paramPath === '') ? 'model' : paramPath + '.model';
          lazyValue = view.getStream(paramPath);
        }
      }
      params[i] = lazyValue;
    }
  }

  hash.params = params;

  options.helperName = options.helperName || 'link-to';

  return viewHelper.call(this, LinkView, options);
}

/**
  See [link-to](/api/classes/Ember.Handlebars.helpers.html#method_link-to)

  @method linkTo
  @for Ember.Handlebars.helpers
  @deprecated
  @param {String} routeName
  @param {Object} [context]*
  @return {String} HTML string
*/
function deprecatedLinkToHelper() {
  Ember.deprecate("The 'linkTo' view helper is deprecated in favor of 'link-to'");

  return linkToHelper.apply(this, arguments);
}

export {
  deprecatedLinkToHelper,
  linkToHelper
};
