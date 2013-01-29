/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set;
var indexOf = Ember.ArrayPolyfills.indexOf;





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

/**
  `Ember.RenderBuffer` gathers information regarding the a view and generates the
  final representation. `Ember.RenderBuffer` will generate HTML which can be pushed
  to the DOM.

  @class RenderBuffer
  @namespace Ember
  @constructor
*/
Ember.RenderBuffer = function(tagName) {
  return new Ember._RenderBuffer(tagName);
};

Ember._RenderBuffer = function(tagName) {
  this.tagNames = [tagName || null];
  this.buffer = [];
};

Ember._RenderBuffer.prototype =
/** @scope Ember.RenderBuffer.prototype */ {

  // The root view's element
  _element: null,

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
    The value for this attribute. Values cannot be set via attr after
    jQuery 1.9, they need to be set with val() instead.

    You should not maintain this value yourself, rather, you should use
    the `val()` method of `Ember.RenderBuffer`.

    @property elementValue
    @type String
    @default null
  */
  elementValue: null,

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
    this.buffer.push(string);
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
    var elementClasses = this.elementClasses = (this.elementClasses || new ClassSet());
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
    Adds an value which will be rendered to the element.

    @method val
    @param {String} value The value to set
    @chainable
    @return {Ember.RenderBuffer|String} this or the current value
  */
  val: function(value) {
    var elementValue = this.elementValue;

    if (arguments.length === 0) {
      return elementValue;
    } else {
      this.elementValue = value;
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
    Adds a style to the style attribute which will be rendered to the element.

    @method style
    @param {String} name Name of the style
    @param {String} value
    @chainable
  */
  style: function(name, value) {
    var style = this.elementStyle = (this.elementStyle || {});

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

    if (!this._element && this.buffer.length === 0) {
      this._element = this.generateElement();
      return;
    }

    var buffer = this.buffer,
        id = this.elementId,
        classes = this.classes,
        attrs = this.elementAttributes,
        value = this.elementValue,
        style = this.elementStyle,
        prop;

    buffer.push('<' + tagName);

    if (id) {
      buffer.push(' id="' + this._escapeAttribute(id) + '"');
      this.elementId = null;
    }
    if (classes) {
      buffer.push(' class="' + this._escapeAttribute(classes.join(' ')) + '"');
      this.classes = null;
    }

    if (style) {
      buffer.push(' style="');

      for (prop in style) {
        if (style.hasOwnProperty(prop)) {
          buffer.push(prop + ':' + this._escapeAttribute(style[prop]) + ';');
        }
      }

      buffer.push('"');

      this.elementStyle = null;
    }

    if (attrs) {
      for (prop in attrs) {
        if (attrs.hasOwnProperty(prop)) {
          buffer.push(' ' + prop + '="' + this._escapeAttribute(attrs[prop]) + '"');
        }
      }

      this.elementAttributes = null;
    }

    if (value) {
      buffer.push(' value="' + this._escapeAttribute(value) + '"');

      this.elementValue = null;
    }

    buffer.push('>');
  },

  pushClosingTag: function() {
    var tagName = this.tagNames.pop();
    if (tagName) { this.buffer.push('</' + tagName + '>'); }
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
        value = this.elementValue,
        style = this.elementStyle,
        styleBuffer = '', prop;

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
      for (prop in attrs) {
        if (attrs.hasOwnProperty(prop)) {
          $element.attr(prop, attrs[prop]);
        }
      }

      this.elementAttributes = null;
    }

    if (value) {
      $element.val(value);

      this.elementValue = null;
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
    if (this._element) {
      return this.element().outerHTML;
    } else {
      return this.innerString();
    }
  },

  innerString: function() {
    return this.buffer.join('');
  },

  _escapeAttribute: function(value) {
    // Stolen shamelessly from Handlebars

    var escape = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "`": "&#x60;"
    };

    var badChars = /&(?!\w+;)|[<>"'`]/g;
    var possible = /[&<>"'`]/;

    var escapeChar = function(chr) {
      return escape[chr] || "&amp;";
    };

    var string = value.toString();

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  }

};
