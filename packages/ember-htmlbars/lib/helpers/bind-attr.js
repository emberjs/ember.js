/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert

import { fmt } from "ember-runtime/system/string";
import QuotedClassAttrNode from "ember-htmlbars/attr_nodes/quoted_class";
import LegacyBindAttrNode from "ember-htmlbars/attr_nodes/legacy_bind";
import View from "ember-views/views/view";
import Stream from "ember-metal/streams/stream";
import keys from "ember-metal/keys";
import helpers from "ember-htmlbars/helpers";
import concat from "ember-htmlbars/hooks/concat";

/**
  `bind-attr` allows you to create a binding between DOM element attributes and
  Ember objects. For example:

  ```handlebars
  <img {{bind-attr src=imageUrl alt=imageTitle}}>
  ```

  The above handlebars template will fill the `<img>`'s `src` attribute with
  the value of the property referenced with `imageUrl` and its `alt`
  attribute with the value of the property referenced with `imageTitle`.

  If the rendering context of this template is the following object:

  ```javascript
  {
    imageUrl: 'http://lolcats.info/haz-a-funny',
    imageTitle: 'A humorous image of a cat'
  }
  ```

  The resulting HTML output will be:

  ```html
  <img src="http://lolcats.info/haz-a-funny" alt="A humorous image of a cat">
  ```

  `bind-attr` cannot redeclare existing DOM element attributes. The use of `src`
  in the following `bind-attr` example will be ignored and the hard coded value
  of `src="/failwhale.gif"` will take precedence:

  ```handlebars
  <img src="/failwhale.gif" {{bind-attr src=imageUrl alt=imageTitle}}>
  ```

  ### `bind-attr` and the `class` attribute

  `bind-attr` supports a special syntax for handling a number of cases unique
  to the `class` DOM element attribute. The `class` attribute combines
  multiple discrete values into a single attribute as a space-delimited
  list of strings. Each string can be:

  * a string return value of an object's property.
  * a boolean return value of an object's property
  * a hard-coded value

  A string return value works identically to other uses of `bind-attr`. The
  return value of the property will become the value of the attribute. For
  example, the following view and template:

  ```javascript
    AView = View.extend({
      someProperty: function() {
        return "aValue";
      }.property()
    })
  ```

  ```handlebars
  <img {{bind-attr class=view.someProperty}}>
  ```

  Result in the following rendered output:

  ```html
  <img class="aValue">
  ```

  A boolean return value will insert a specified class name if the property
  returns `true` and remove the class name if the property returns `false`.

  A class name is provided via the syntax
  `somePropertyName:class-name-if-true`.

  ```javascript
  AView = View.extend({
    someBool: true
  })
  ```

  ```handlebars
  <img {{bind-attr class="view.someBool:class-name-if-true"}}>
  ```

  Result in the following rendered output:

  ```html
  <img class="class-name-if-true">
  ```

  An additional section of the binding can be provided if you want to
  replace the existing class instead of removing it when the boolean
  value changes:

  ```handlebars
  <img {{bind-attr class="view.someBool:class-name-if-true:class-name-if-false"}}>
  ```

  A hard-coded value can be used by prepending `:` to the desired
  class name: `:class-name-to-always-apply`.

  ```handlebars
  <img {{bind-attr class=":class-name-to-always-apply"}}>
  ```

  Results in the following rendered output:

  ```html
  <img class="class-name-to-always-apply">
  ```

  All three strategies - string return value, boolean return value, and
  hard-coded value – can be combined in a single declaration:

  ```handlebars
  <img {{bind-attr class=":class-name-to-always-apply view.someBool:class-name-if-true view.someProperty"}}>
  ```

  @method bind-attr
  @for Ember.Handlebars.helpers
  @param {Hash} options
  @return {String} HTML string
*/
function bindAttrHelper(params, hash, options, env) {
  var element = options.element;

  Ember.assert("You must specify at least one hash argument to bind-attr", !!keys(hash).length);

  var view = this;

  // Handle classes differently, as we can bind multiple classes
  var classBindings = hash['class'];
  if (classBindings != null) {
    var attrValue = streamifyClassBindings(view, classBindings);
    new QuotedClassAttrNode(element, 'class', attrValue, env.dom);
    delete hash['class'];
  }

  var attrKeys = keys(hash);

  var attr, path, lazyValue;
  for (var i=0, l=attrKeys.length;i<l;i++) {
    attr = attrKeys[i];
    path = hash[attr];
    if (path.isStream) {
      lazyValue = path;
    } else {
      Ember.assert(
        fmt("You must provide an expression as the value of bound attribute." +
            " You specified: %@=%@", [attr, path]),
        typeof path === 'string'
      );
      lazyValue = view.getStream(path);
    }
    new LegacyBindAttrNode(element, attr, lazyValue, env.dom);
  }
}

/**
  See `bind-attr`

  @method bindAttr
  @for Ember.Handlebars.helpers
  @deprecated
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function bindAttrHelperDeprecated() {
  Ember.deprecate("The 'bindAttr' view helper is deprecated in favor of 'bind-attr'");

  return helpers['bind-attr'].apply(this, arguments);
}

/**
  Helper that, given a space-separated string of property paths and a context,
  returns an array of class names. Calling this method also has the side
  effect of setting up observers at those property paths, such that if they
  change, the correct class name will be reapplied to the DOM element.

  For example, if you pass the string "fooBar", it will first look up the
  "fooBar" value of the context. If that value is true, it will add the
  "foo-bar" class to the current element (i.e., the dasherized form of
  "fooBar"). If the value is a string, it will add that string as the class.
  Otherwise, it will not add any new class name.

  @private
  @method bindClasses
  @for Ember.Handlebars
  @param {String} classBindings A string, space-separated, of class bindings
    to use
  @param {View} view The view in which observers should look for the
    element to update
  @return {Array} An array of class names to add
*/
function streamifyClassBindings(view, classBindingsString) {
  var classBindings = classBindingsString.split(' ');
  var streamified = [];

  var parsedPath;
  for (var i=0, l=classBindings.length;i<l;i++) {
    parsedPath = View._parsePropertyPath(classBindings[i]);

    if (parsedPath.path === '') {
      streamified.push(classStringForParsedPath(parsedPath, true) + " ");
    } else {
      (function(){
        var lazyValue = view.getStream(parsedPath.path);
        var _parsedPath = parsedPath;
        var classNameBound = new Stream(function(){
          var value = lazyValue.value();
          return classStringForParsedPath(_parsedPath, value) + " ";
        });
        lazyValue.subscribe(classNameBound.notify, classNameBound);
        streamified.push(classNameBound);
      })(); // jshint ignore:line
    }
  }

  return concat(streamified);
}

function classStringForParsedPath(parsedPath, value) {
  return View._classStringForValue(parsedPath.path, value, parsedPath.className, parsedPath.falsyClassName);
}

export default bindAttrHelper;

export {
  bindAttrHelper,
  bindAttrHelperDeprecated
};
