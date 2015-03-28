/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert

import { fmt } from "ember-runtime/system/string";
import AttrNode from "ember-views/attr_nodes/attr_node";
import LegacyBindAttrNode from "ember-views/attr_nodes/legacy_bind";
import keys from "ember-metal/keys";
import helpers from "ember-htmlbars/helpers";
import { map } from 'ember-metal/enumerable_utils';
import {
  isStream,
  concat
} from "ember-metal/streams/utils";
import {
  streamifyClassNameBinding
} from "ember-views/streams/class_name_binding";

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

  var view = env.data.view;

  // Handle classes differently, as we can bind multiple classes
  var classNameBindings = hash['class'];
  if (classNameBindings !== null && classNameBindings !== undefined) {
    if (!isStream(classNameBindings)) {
      classNameBindings = applyClassNameBindings(classNameBindings, view);
    }

    var classView = new AttrNode('class', classNameBindings);
    classView._morph = env.dom.createAttrMorph(element, 'class');

    Ember.assert(
      'You cannot set `class` manually and via `{{bind-attr}}` helper on the same element. ' +
      'Please use `{{bind-attr}}`\'s `:static-class` syntax instead.',
      !element.getAttribute('class')
    );

    view.appendChild(classView);
  }

  var attrKeys = keys(hash);

  var attr, path, lazyValue, attrView;
  for (var i=0, l=attrKeys.length;i<l;i++) {
    attr = attrKeys[i];
    if (attr === 'class') {
      continue;
    }
    path = hash[attr];
    if (isStream(path)) {
      lazyValue = path;
    } else {
      Ember.assert(
        fmt("You must provide an expression as the value of bound attribute." +
            " You specified: %@=%@", [attr, path]),
        typeof path === 'string'
      );
      lazyValue = view.getStream(path);
    }

    attrView = new LegacyBindAttrNode(attr, lazyValue);
    attrView._morph = env.dom.createAttrMorph(element, attr);

    Ember.assert(
      'You cannot set `' + attr + '` manually and via `{{bind-attr}}` helper on the same element.',
      !element.getAttribute(attr)
    );

    view.appendChild(attrView);
  }
}

function applyClassNameBindings(classNameBindings, view) {
  var arrayOfClassNameBindings = classNameBindings.split(' ');
  var boundClassNameBindings = map(arrayOfClassNameBindings, function(classNameBinding) {
    return streamifyClassNameBinding(view, classNameBinding);
  });
  var concatenatedClassNames = concat(boundClassNameBindings, ' ');
  return concatenatedClassNames;
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

  return helpers['bind-attr'].helperFunction.apply(this, arguments);
}

export default bindAttrHelper;

export {
  bindAttrHelper,
  bindAttrHelperDeprecated
};
