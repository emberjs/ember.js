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
  this.elementTag = tagName;
  this.childBuffers = [];
};

Ember._RenderBuffer.prototype =
/** @scope Ember.RenderBuffer.prototype */ {

  /**
    Array of class-names which will be applied in the class attribute.

    You should not maintain this array yourself, rather, you should use
    the `addClass()` method of `Ember.RenderBuffer.`

    @property elementClasses
    @type Array
    @default []
  */
  elementClasses: null,

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
    this.childBuffers.push(String(string));
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

    return this;
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

  /**
    @private

    Create a new child render buffer from a parent buffer. Optionally set
    additional properties on the buffer. Optionally invoke a callback
    with the newly created buffer.

    This is a primitive method used by other public methods: `begin`,
    `prepend`, `replaceWith`, `insertAfter`.

    @method newBuffer
    @param {String} tagName Tag name to use for the child buffer's element
    @param {Ember._RenderBuffer} parent The parent render buffer that this
      buffer should be appended to.
    @param {Function} fn A callback to invoke with the newly created buffer.
    @param {Object} other Additional properties to add to the newly created
      buffer.
  */
  newBuffer: function(tagName, parent, fn, other) {
    var buffer = new Ember._RenderBuffer(tagName);
    buffer.parentBuffer = parent;

    if (other) { Ember.$.extend(buffer, other); }
    if (fn) { fn.call(this, buffer); }

    return buffer;
  },

  /**
    @private

    Replace the current buffer with a new buffer. This is a primitive
    used by `remove`, which passes `null` for `newBuffer`, and `replaceWith`,
    which passes the new buffer it created.

    @method replaceWithBuffer
    @param {Ember._RenderBuffer} buffer The buffer to insert in place of
      the existing buffer.
  */
  replaceWithBuffer: function(newBuffer) {
    var parent = this.parentBuffer;
    if (!parent) { return; }

    var childBuffers = parent.childBuffers;

    var index = indexOf.call(childBuffers, this);

    if (newBuffer) {
      childBuffers.splice(index, 1, newBuffer);
    } else {
      childBuffers.splice(index, 1);
    }
  },

  /**
    Creates a new `Ember.RenderBuffer` object with the provided tagName as
    the element tag and with its `parentBuffer` property set to the current
    `Ember.RenderBuffer`.

    @method begin
    @param {String} tagName Tag name to use for the child buffer's element
    @return {Ember.RenderBuffer} A new RenderBuffer object
  */
  begin: function(tagName) {
    return this.newBuffer(tagName, this, function(buffer) {
      this.childBuffers.push(buffer);
    });
  },

  /**
    Prepend a new child buffer to the current render buffer.

    @method prepend
    @param {String} tagName Tag name to use for the child buffer's element
  */
  prepend: function(tagName) {
    return this.newBuffer(tagName, this, function(buffer) {
      this.childBuffers.splice(0, 0, buffer);
    });
  },

  /**
    Replace the current buffer with a new render buffer.

    @method replaceWith
    @param {String} tagName Tag name to use for the new buffer's element
  */
  replaceWith: function(tagName) {
    var parentBuffer = this.parentBuffer;

    return this.newBuffer(tagName, parentBuffer, function(buffer) {
      this.replaceWithBuffer(buffer);
    });
  },

  /**
    Insert a new render buffer after the current render buffer.

    @method insertAfter
    @param {String} tagName Tag name to use for the new buffer's element
  */
  insertAfter: function(tagName) {
    var parentBuffer = get(this, 'parentBuffer');

    return this.newBuffer(tagName, parentBuffer, function(buffer) {
      var siblings = parentBuffer.childBuffers;
      var index = indexOf.call(siblings, this);
      siblings.splice(index + 1, 0, buffer);
    });
  },

  /**
    Closes the current buffer and adds its content to the parentBuffer.

    @method end
    @return {Ember.RenderBuffer} The parentBuffer, if one exists. Otherwise, this
  */
  end: function() {
    var parent = this.parentBuffer;
    return parent || this;
  },

  remove: function() {
    this.replaceWithBuffer(null);
  },

  /**
    @method element
    @return {DOMElement} The element corresponding to the generated HTML
      of this buffer
  */
  element: function() {
    var element = document.createElement(this.elementTag),
        id = this.elementId,
        classes = this.elementClasses,
        attrs = this.elementAttributes,
        style = this.elementStyle,
        styleBuffer = '', prop;

    if (id) { element.setAttribute('id', id); }
    if (classes) { element.setAttribute('class', classes.toDOM()); }

    if (style) {
      for (prop in style) {
        if (style.hasOwnProperty(prop)) {
          styleBuffer += (prop + ':' + style[prop] + ';');
        }
      }

      element.setAttribute('style', styleBuffer);
    }

    if (attrs) {
      for (prop in attrs) {
        if (attrs.hasOwnProperty(prop)) {
          element.setAttribute(prop, attrs[prop]);
        }
      }
    }

    this.elementTag = ''; // hack to avoid creating an innerString function
    element.innerHTML = this.string();
    return element;
  },

  /**
    Generates the HTML content for this buffer.

    @method string
    @return {String} The generated HTML
  */
  string: function() {
    var content = [];
    return this.array(content).join('');
  },

  array: function(content) {
    var tag = this.elementTag, openTag;

    if (tag) {
      var id = this.elementId,
          classes = this.elementClasses,
          attrs = this.elementAttributes,
          style = this.elementStyle,
          styleBuffer = '', prop;

      content.push("<" + tag);

      if (id) { content.push(' id="' + this._escapeAttribute(id) + '"'); }
      if (classes) { content.push(' class="' + this._escapeAttribute(classes.toDOM()) + '"'); }

      if (style) {
        content.push(' style="');

        for (prop in style) {
          if (style.hasOwnProperty(prop)) {
            content.push(prop + ':' + this._escapeAttribute(style[prop]) + ';');
          }
        }

        content.push('"');
      }

      if (attrs) {
        for (prop in attrs) {
          if (attrs.hasOwnProperty(prop)) {
            content.push(' ' + prop + '="' + this._escapeAttribute(attrs[prop]) + '"');
          }
        }
      }

      content.push('>');
    }

    var childBuffers = this.childBuffers;

    Ember.ArrayPolyfills.forEach.call(childBuffers, function(buffer) {
      var stringy = typeof buffer === 'string';
      if (stringy) {
        content.push(buffer);
      } else {
        buffer.array(content);
      }
    });

    if (tag) {
      content.push("</" + tag + ">");
    }
    return content;
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
