/**
@module ember
@submodule ember-views
*/

import { setInnerHTML } from "ember-views/system/utils";
import jQuery from "ember-views/system/jquery";
import {DOMHelper} from "morph";
import Ember from "ember-metal/core";

// The HTML spec allows for "omitted start tags". These tags are optional
// when their intended child is the first thing in the parent tag. For
// example, this is a tbody start tag:
//
// <table>
//   <tbody>
//     <tr>
//
// The tbody may be omitted, and the browser will accept and render:
//
// <table>
//   <tr>
//
// However, the omitted start tag will still be added to the DOM. Here
// we test the string and context to see if the browser is about to
// perform this cleanup, but with a special allowance for disregarding
// <script tags. This disregarding of <script being the first child item
// may bend the offical spec a bit, and is only needed for Handlebars
// templates.
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#optional-tags
// describes which tags are omittable. The spec for tbody and colgroup
// explains this behavior:
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-tbody-element
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-colgroup-element
//
var omittedStartTagChildren = {
  tr: document.createElement('tbody'),
  col: document.createElement('colgroup')
};

var omittedStartTagChildTest = /(?:<script)*.*?<([\w:]+)/i;

function detectOmittedStartTag(string, contextualElement){
  // Omitted start tags are only inside table tags.
  if (contextualElement.tagName === 'TABLE') {
    var omittedStartTagChildMatch = omittedStartTagChildTest.exec(string);
    if (omittedStartTagChildMatch) {
      // It is already asserted that the contextual element is a table
      // and not the proper start tag. Just look up the start tag.
      return omittedStartTagChildren[omittedStartTagChildMatch[1].toLowerCase()];
    }
  }
}

function ClassSet() {
  this.seen = {};
  this.list = [];
}

ClassSet.prototype = {
  add: function(string) {
    if (string in this.seen) { return; }
    this.seen[string] = true;

    this.list.push(string);
  },

  toDOM: function() {
    return this.list.join(" ");
  }
};

var BAD_TAG_NAME_TEST_REGEXP = /[^a-zA-Z0-9\-]/;
var BAD_TAG_NAME_REPLACE_REGEXP = /[^a-zA-Z0-9\-]/g;

function stripTagName(tagName) {
  if (!tagName) {
    return tagName;
  }

  if (!BAD_TAG_NAME_TEST_REGEXP.test(tagName)) {
    return tagName;
  }

  return tagName.replace(BAD_TAG_NAME_REPLACE_REGEXP, '');
}

var BAD_CHARS_REGEXP = /&(?!\w+;)|[<>"'`]/g;
var POSSIBLE_CHARS_REGEXP = /[&<>"'`]/;

function escapeAttribute(value) {
  // Stolen shamelessly from Handlebars

  var escape = {
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var escapeChar = function(chr) {
    return escape[chr] || "&amp;";
  };

  var string = value.toString();

  if(!POSSIBLE_CHARS_REGEXP.test(string)) { return string; }
  return string.replace(BAD_CHARS_REGEXP, escapeChar);
}

// IE 6/7 have bugs around setting names on inputs during creation.
// From http://msdn.microsoft.com/en-us/library/ie/ms536389(v=vs.85).aspx:
// "To include the NAME attribute at run time on objects created with the createElement method, use the eTag."
var canSetNameOnInputs = (function() {
  var div = document.createElement('div');
  var el = document.createElement('input');

  el.setAttribute('name', 'foo');
  div.appendChild(el);

  return !!div.innerHTML.match('foo');
})();

/**
  `Ember.renderBuffer` gathers information regarding the view and generates the
  final representation. `Ember.renderBuffer` will generate HTML which can be pushed
  to the DOM.

   ```javascript
   var buffer = Ember.renderBuffer('div', contextualElement);
  ```

  @method renderBuffer
  @namespace Ember
  @param {String} tagName tag name (such as 'div' or 'p') used for the buffer
*/
export default function renderBuffer(tagName, contextualElement) {
  return new _RenderBuffer(tagName, contextualElement); // jshint ignore:line
}

function _RenderBuffer(tagName, contextualElement) {
  this.tagName = tagName;
  this._contextualElement = contextualElement;
  this.buffer = null;
  this.childViews = [];
  this.dom = new DOMHelper();
}

_RenderBuffer.prototype = {

  reset: function(tagName, contextualElement) {
    this.tagName = tagName;
    this.buffer = null;
    this._element = null;
    this._contextualElement = contextualElement;
    this.elementClasses = null;
    this.elementId = null;
    this.elementAttributes = null;
    this.elementProperties = null;
    this.elementTag = null;
    this.elementStyle = null;
    this.childViews.length = 0;
  },

  // The root view's element
  _element: null,

  // The root view's contextualElement
  _contextualElement: null,

  /**
    An internal set used to de-dupe class names when `addClass()` is
    used. After each call to `addClass()`, the `classes` property
    will be updated.

    @private
    @property elementClasses
    @type Array
    @default null
  */
  elementClasses: null,

  /**
    Array of class names which will be applied in the class attribute.

    You can use `setClasses()` to set this property directly. If you
    use `addClass()`, it will be maintained for you.

    @property classes
    @type Array
    @default null
  */
  classes: null,

  /**
    The id in of the element, to be applied in the id attribute.

    You should not set this property yourself, rather, you should use
    the `id()` method of `Ember.RenderBuffer`.

    @property elementId
    @type String
    @default null
  */
  elementId: null,

  /**
    A hash keyed on the name of the attribute and whose value will be
    applied to that attribute. For example, if you wanted to apply a
    `data-view="Foo.bar"` property to an element, you would set the
    elementAttributes hash to `{'data-view':'Foo.bar'}`.

    You should not maintain this hash yourself, rather, you should use
    the `attr()` method of `Ember.RenderBuffer`.

    @property elementAttributes
    @type Hash
    @default {}
  */
  elementAttributes: null,

  /**
    A hash keyed on the name of the properties and whose value will be
    applied to that property. For example, if you wanted to apply a
    `checked=true` property to an element, you would set the
    elementProperties hash to `{'checked':true}`.

    You should not maintain this hash yourself, rather, you should use
    the `prop()` method of `Ember.RenderBuffer`.

    @property elementProperties
    @type Hash
    @default {}
  */
  elementProperties: null,

  /**
    The tagname of the element an instance of `Ember.RenderBuffer` represents.

    Usually, this gets set as the first parameter to `Ember.RenderBuffer`. For
    example, if you wanted to create a `p` tag, then you would call

    ```javascript
    Ember.RenderBuffer('p', contextualElement)
    ```

    @property elementTag
    @type String
    @default null
  */
  elementTag: null,

  /**
    A hash keyed on the name of the style attribute and whose value will
    be applied to that attribute. For example, if you wanted to apply a
    `background-color:black;` style to an element, you would set the
    elementStyle hash to `{'background-color':'black'}`.

    You should not maintain this hash yourself, rather, you should use
    the `style()` method of `Ember.RenderBuffer`.

    @property elementStyle
    @type Hash
    @default {}
  */
  elementStyle: null,

  pushChildView: function (view) {
    var index = this.childViews.length;
    this.childViews[index] = view;
    this.push("<script id='morph-"+index+"' type='text/x-placeholder'>\x3C/script>");
  },

  hydrateMorphs: function () {
    var childViews = this.childViews;
    var el = this._element;
    for (var i=0,l=childViews.length; i<l; i++) {
      var childView = childViews[i];
      var ref = el.querySelector('#morph-'+i);
      var parent = ref.parentNode;

      childView._morph = this.dom.insertMorphBefore(parent, ref);
      parent.removeChild(ref);
    }
  },

  /**
    Adds a string of HTML to the `RenderBuffer`.

    @method push
    @param {String} string HTML to push into the buffer
    @chainable
  */
  push: function(string) {
    if (this.buffer === null) {
      this.buffer = '';
    }
    this.buffer += string;
    return this;
  },

  /**
    Adds a class to the buffer, which will be rendered to the class attribute.

    @method addClass
    @param {String} className Class name to add to the buffer
    @chainable
  */
  addClass: function(className) {
    // lazily create elementClasses
    this.elementClasses = (this.elementClasses || new ClassSet());
    this.elementClasses.add(className);
    this.classes = this.elementClasses.list;

    return this;
  },

  setClasses: function(classNames) {
    this.elementClasses = null;
    var len = classNames.length;
    var i;
    for (i = 0; i < len; i++) {
      this.addClass(classNames[i]);
    }
  },

  /**
    Sets the elementID to be used for the element.

    @method id
    @param {String} id
    @chainable
  */
  id: function(id) {
    this.elementId = id;
    return this;
  },

  // duck type attribute functionality like jQuery so a render buffer
  // can be used like a jQuery object in attribute binding scenarios.

  /**
    Adds an attribute which will be rendered to the element.

    @method attr
    @param {String} name The name of the attribute
    @param {String} value The value to add to the attribute
    @chainable
    @return {Ember.RenderBuffer|String} this or the current attribute value
  */
  attr: function(name, value) {
    var attributes = this.elementAttributes = (this.elementAttributes || {});

    if (arguments.length === 1) {
      return attributes[name];
    } else {
      attributes[name] = value;
    }

    return this;
  },

  /**
    Remove an attribute from the list of attributes to render.

    @method removeAttr
    @param {String} name The name of the attribute
    @chainable
  */
  removeAttr: function(name) {
    var attributes = this.elementAttributes;
    if (attributes) { delete attributes[name]; }

    return this;
  },

  /**
    Adds a property which will be rendered to the element.

    @method prop
    @param {String} name The name of the property
    @param {String} value The value to add to the property
    @chainable
    @return {Ember.RenderBuffer|String} this or the current property value
  */
  prop: function(name, value) {
    var properties = this.elementProperties = (this.elementProperties || {});

    if (arguments.length === 1) {
      return properties[name];
    } else {
      properties[name] = value;
    }

    return this;
  },

  /**
    Remove an property from the list of properties to render.

    @method removeProp
    @param {String} name The name of the property
    @chainable
  */
  removeProp: function(name) {
    var properties = this.elementProperties;
    if (properties) { delete properties[name]; }

    return this;
  },

  /**
    Adds a style to the style attribute which will be rendered to the element.

    @method style
    @param {String} name Name of the style
    @param {String} value
    @chainable
  */
  style: function(name, value) {
    this.elementStyle = (this.elementStyle || {});

    this.elementStyle[name] = value;
    return this;
  },

  generateElement: function() {
    var tagName = this.tagName;
    var id = this.elementId;
    var classes = this.classes;
    var attrs = this.elementAttributes;
    var props = this.elementProperties;
    var style = this.elementStyle;
    var styleBuffer = '';
    var attr, prop, tagString;

    if (attrs && attrs.name && !canSetNameOnInputs) {
      // IE allows passing a tag to createElement. See note on `canSetNameOnInputs` above as well.
      tagString = '<'+stripTagName(tagName)+' name="'+escapeAttribute(attrs.name)+'">';
    } else {
      tagString = tagName;
    }

    var element = this.dom.createElement(tagString);
    var $element = jQuery(element);

    if (id) {
      $element.attr('id', id);
      this.elementId = null;
    }
    if (classes) {
      $element.attr('class', classes.join(' '));
      this.classes = null;
      this.elementClasses = null;
    }

    if (style) {
      for (prop in style) {
        if (style.hasOwnProperty(prop)) {
          styleBuffer += (prop + ':' + style[prop] + ';');
        }
      }

      $element.attr('style', styleBuffer);

      this.elementStyle = null;
    }

    if (attrs) {
      for (attr in attrs) {
        if (attrs.hasOwnProperty(attr)) {
          $element.attr(attr, attrs[attr]);
        }
      }

      this.elementAttributes = null;
    }

    if (props) {
      for (prop in props) {
        if (props.hasOwnProperty(prop)) {
          $element.prop(prop, props[prop]);
        }
      }

      this.elementProperties = null;
    }

    this._element = element;
  },

  /**
    @method element
    @return {DOMElement} The element corresponding to the generated HTML
      of this buffer
  */
  element: function() {
    if (!this._contextualElement) {
      Ember.deprecate("buffer.element expects a contextualElement to exist. This ensures DOM that requires context is correctly generated (tr, SVG tags). Defaulting to document.body, but this will be removed in the future");
      this._contextualElement = document.body;
    }
    var html = this.innerString();

    if (this._element) {
      if (html) {
        this._element = setInnerHTML(this._element, html);
        this.hydrateMorphs();
      }
    } else {
      if (html) {
        var omittedStartTag = detectOmittedStartTag(html, this._contextualElement);
        var parsed = this.dom.parseHTML(html, omittedStartTag || this._contextualElement);
        var frag = this._element = document.createDocumentFragment();
        for (var i=0,l=parsed.length; i<l; i++) {
          frag.appendChild(parsed[0]); // As nodes are appended they are removed from the node list
        }
        this.hydrateMorphs();
      } else if (html === '') {
        this._element = html;
      }
    }
    return this._element;
  },

  /**
    Generates the HTML content for this buffer.

    @method string
    @return {String} The generated HTML
  */
  string: function() {
    if (this._element) {
      // Firefox versions < 11 do not have support for element.outerHTML.
      var thisElement = this.element();
      var outerHTML = thisElement.outerHTML;
      if (typeof outerHTML === 'undefined') {
        return jQuery('<div/>').append(thisElement).html();
      }
      return outerHTML;
    } else {
      return this.innerString();
    }
  },

  innerString: function() {
    return this.buffer;
  }
};
