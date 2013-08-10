/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set;

var ClassSet = function() {
  this.seen = {};
  this.list = [];
};

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

/**
  `Ember.RenderBuffer` gathers information regarding the a view and generates the
  final representation. `Ember.RenderBuffer` will generate HTML which can be pushed
  to the DOM.

   ```javascript
   var buffer = Ember.RenderBuffer('div');
  ```

  @class RenderBuffer
  @namespace Ember
  @constructor
  @param {String} tagName tag name (such as 'div' or 'p') used for the buffer
*/
Ember.RenderBuffer = function(tagName) {
  return new Ember._RenderBuffer(tagName);
};

Ember._RenderBuffer = function(tagName) {
  this.tagNames = [tagName || null];
  this.buffer = "";
};

Ember._RenderBuffer.prototype =
/** @scope Ember.RenderBuffer.prototype */ {

  // The root view's element
  _element: null,

  _hasElement: true,

  /**
    @private

    An internal set used to de-dupe class names when `addClass()` is
    used. After each call to `addClass()`, the `classes` property
    will be updated.

    @property elementClasses
    @type Array
    @default []
  */
  elementClasses: null,

  /**
    Array of class names which will be applied in the class attribute.

    You can use `setClasses()` to set this property directly. If you
    use `addClass()`, it will be maintained for you.

    @property classes
    @type Array
    @default []
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
    Ember.RenderBuffer('p')
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

  /**
    Nested `RenderBuffers` will set this to their parent `RenderBuffer`
    instance.

    @property parentBuffer
    @type Ember._RenderBuffer
  */
  parentBuffer: null,

  /**
    Adds a string of HTML to the `RenderBuffer`.

    @method push
    @param {String} string HTML to push into the buffer
    @chainable
  */
  push: function(string) {
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
    this.classes = classNames;
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
    Adds an property which will be rendered to the element.

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

  begin: function(tagName) {
    this.tagNames.push(tagName || null);
    return this;
  },

  pushOpeningTag: function() {
    var tagName = this.currentTagName();
    if (!tagName) { return; }

    if (this._hasElement && !this._element && this.buffer.length === 0) {
      this._element = this.generateElement();
      return;
    }

    var buffer = this.buffer,
        id = this.elementId,
        classes = this.classes,
        attrs = this.elementAttributes,
        props = this.elementProperties,
        style = this.elementStyle,
        attr, prop;

    buffer += '<' + stripTagName(tagName);

    if (id) {
      buffer += ' id="' + escapeAttribute(id) + '"';
      this.elementId = null;
    }
    if (classes) {
      buffer += ' class="' + escapeAttribute(classes.join(' ')) + '"';
      this.classes = null;
    }

    if (style) {
      buffer += ' style="';

      for (prop in style) {
        if (style.hasOwnProperty(prop)) {
          buffer += prop + ':' + escapeAttribute(style[prop]) + ';';
        }
      }

      buffer += '"';

      this.elementStyle = null;
    }

    if (attrs) {
      for (attr in attrs) {
        if (attrs.hasOwnProperty(attr)) {
          buffer += ' ' + attr + '="' + escapeAttribute(attrs[attr]) + '"';
        }
      }

      this.elementAttributes = null;
    }

    if (props) {
      for (prop in props) {
        if (props.hasOwnProperty(prop)) {
          var value = props[prop];
          if (value || typeof(value) === 'number') {
            if (value === true) {
              buffer += ' ' + prop + '="' + prop + '"';
            } else {
              buffer += ' ' + prop + '="' + escapeAttribute(props[prop]) + '"';
            }
          }
        }
      }

      this.elementProperties = null;
    }

    buffer += '>';
    this.buffer = buffer;
  },

  pushClosingTag: function() {
    var tagName = this.tagNames.pop();
    if (tagName) { this.buffer += '</' + stripTagName(tagName) + '>'; }
  },

  currentTagName: function() {
    return this.tagNames[this.tagNames.length-1];
  },

  generateElement: function() {
    var tagName = this.tagNames.pop(), // pop since we don't need to close
        element = document.createElement(tagName),
        $element = Ember.$(element),
        id = this.elementId,
        classes = this.classes,
        attrs = this.elementAttributes,
        props = this.elementProperties,
        style = this.elementStyle,
        styleBuffer = '', attr, prop;

    if (id) {
      $element.attr('id', id);
      this.elementId = null;
    }
    if (classes) {
      $element.attr('class', classes.join(' '));
      this.classes = null;
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

    return element;
  },

  /**
    @method element
    @return {DOMElement} The element corresponding to the generated HTML
      of this buffer
  */
  element: function() {
    var html = this.innerString();

    if (html) {
      this._element = Ember.ViewUtils.setInnerHTML(this._element, html);
    }

    return this._element;
  },

  /**
    Generates the HTML content for this buffer.

    @method string
    @return {String} The generated HTML
  */
  string: function() {
    if (this._hasElement && this._element) {
      // Firefox versions < 11 do not have support for element.outerHTML.
      var thisElement = this.element(), outerHTML = thisElement.outerHTML;
      if (typeof outerHTML === 'undefined') {
        return Ember.$('<div/>').append(thisElement).html();
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
