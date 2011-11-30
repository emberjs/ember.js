// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set;

/**
  @class

  SC.RenderBuffer gathers information regarding the a view and generates the
  final representation. SC.RenderBuffer will generate HTML which can be pushed
  to the DOM.

  @extends SC.Object
*/
SC.RenderBuffer = function(tagName) {
  return SC._RenderBuffer.create({ elementTag: tagName });
};

SC._RenderBuffer = SC.Object.extend(
/** @scope SC.RenderBuffer.prototype */ {

  /**
    Array of class-names which will be applied in the class="" attribute

    You should not maintain this array yourself, rather, you should use
    the addClass() method of SC.RenderBuffer.

    @type Array
    @default []
  */
  elementClasses: null,

  /**
    The id in of the element, to be applied in the id="" attribute

    You should not set this property yourself, rather, you should use
    the id() method of SC.RenderBuffer.

    @type String
    @default null
  */
  elementId: null,

  /**
    A hash keyed on the name of the attribute and whose value will be
    applied to that attribute. For example, if you wanted to apply a
    data-view="Foo.bar" property to an element, you would set the
    elementAttributes hash to {'data-view':'Foo.bar'}

    You should not maintain this hash yourself, rather, you should use
    the attr() method of SC.RenderBuffer.

    @type Hash
    @default {}
  */
  elementAttributes: null,

  /**
    The tagname of the element an instance of SC.RenderBuffer represents.

    Usually, this gets set as the first parameter to SC.RenderBuffer. For
    example, if you wanted to create a `p` tag, then you would call

      SC.RenderBuffer('p')

    @type String
    @default null
  */
  elementTag: null,

  /**
    A hash keyed on the name of the style attribute and whose value will
    be applied to that attribute. For example, if you wanted to apply a
    background-color:black;" style to an element, you would set the
    elementStyle hash to {'background-color':'black'}

    You should not maintain this hash yourself, rather, you should use
    the style() method of SC.RenderBuffer.

    @type Hash
    @default {}
  */
  elementStyle: null,

  /**
    Nested RenderBuffers will set this to their parent RenderBuffer
    instance.

    @type SC._RenderBuffer
  */
  parentBuffer: null,

  /** @private */
  init: function() {
    this._super();

    set(this ,'elementClasses', SC.A());
    set(this, 'elementAttributes', {});
    set(this, 'elementStyle', {});
    set(this, 'childBuffers', SC.A());
    set(this, 'elements', {});
  },

  /**
    Adds a string of HTML to the RenderBuffer.

    @param {String} string HTML to push into the buffer
    @returns {SC.RenderBuffer} this
  */
  push: function(string) {
    get(this, 'childBuffers').pushObject(String(string));
    return this;
  },

  /**
    Adds a class to the buffer, which will be rendered to the class attribute.

    @param {String} className Class name to add to the buffer
    @returns {SC.RenderBuffer} this
  */
  addClass: function(className) {
    get(this, 'elementClasses').addObject(className);
    return this;
  },

  /**
    Sets the elementID to be used for the element.

    @param {String} id
    @returns {SC.RenderBuffer} this
  */
  id: function(id) {
    set(this, 'elementId', id);
    return this;
  },

  /**
    Adds an attribute which will be rendered to the element.

    @param {String} name The name of the attribute
    @param {String} value The value to add to the attribute
    @returns {SC.RenderBuffer} this
  */
  attr: function(name, value) {
    get(this, 'elementAttributes')[name] = value;
    return this;
  },

  /**
    Adds a style to the style attribute which will be rendered to the element.

    @param {String} name Name of the style
    @param {String} value
    @returns {SC.RenderBuffer} this
  */
  style: function(name, value) {
    get(this, 'elementStyle')[name] = value;
    return this;
  },

  /**
    Create a new child render buffer from a parent buffer. Optionally set
    additional properties on the buffer. Optionally invoke a callback
    with the newly created buffer.

    This is a primitive method used by other public methods: `begin`,
    `prepend`, `replaceWith`, `insertAfter`.

    @private
    @param {String} tagName Tag name to use for the child buffer's element
    @param {SC._RenderBuffer} parent The parent render buffer that this
      buffer should be appended to.
    @param {Function} fn A callback to invoke with the newly created buffer.
    @param {Object} other Additional properties to add to the newly created
      buffer.
  */
  newBuffer: function(tagName, parent, fn, other) {
    var buffer = SC._RenderBuffer.create({
      parentBuffer: parent,
      elementTag: tagName
    });

    if (other) { buffer.setProperties(other); }
    if (fn) { fn.call(this, buffer); }

    return buffer;
  },

  /**
    Replace the current buffer with a new buffer. This is a primitive
    used by `remove`, which passes `null` for `newBuffer`, and `replaceWith`,
    which passes the new buffer it created.

    @private
    @param {SC._RenderBuffer} buffer The buffer to insert in place of
      the existing buffer.
  */
  replaceWithBuffer: function(newBuffer) {
    var parent = get(this, 'parentBuffer');
    if (!parent) { return; }

    var childBuffers = get(parent, 'childBuffers');

    var index = childBuffers.indexOf(this);

    if (newBuffer) {
      childBuffers.splice(index, 1, newBuffer);
    } else {
      childBuffers.splice(index, 1);
    }
  },

  /**
    Creates a new SC.RenderBuffer object with the provided tagName as
    the element tag and with its parentBuffer property set to the current
    SC.RenderBuffer.

    @param {String} tagName Tag name to use for the child buffer's element
    @returns {SC.RenderBuffer} A new RenderBuffer object
  */
  begin: function(tagName) {
    return this.newBuffer(tagName, this, function(buffer) {
      get(this, 'childBuffers').pushObject(buffer);
    });
  },

  /**
    Prepend a new child buffer to the current render buffer.

    @param {String} tagName Tag name to use for the child buffer's element
  */
  prepend: function(tagName) {
    return this.newBuffer(tagName, this, function(buffer) {
      get(this, 'childBuffers').insertAt(0, buffer);
    });
  },

  /**
    Replace the current buffer with a new render buffer.

    @param {String} tagName Tag name to use for the new buffer's element
  */
  replaceWith: function(tagName) {
    var parentBuffer = get(this, 'parentBuffer');

    return this.newBuffer(tagName, parentBuffer, function(buffer) {
      this.replaceWithBuffer(buffer);
    });
  },

  /**
    Insert a new render buffer after the current render buffer.

    @param {String} tagName Tag name to use for the new buffer's element
  */
  insertAfter: function(tagName) {
    var parentBuffer = get(this, 'parentBuffer');

    return this.newBuffer(tagName, parentBuffer, function(buffer) {
      var siblings = get(parentBuffer, 'childBuffers');
      var index = siblings.indexOf(this);
      siblings.insertAt(index + 1, buffer);
    });
  },

  /**
    Closes the current buffer and adds its content to the parentBuffer.

    @returns {SC.RenderBuffer} The parentBuffer, if one exists. Otherwise, this
  */
  end: function() {
    var parent = get(this, 'parentBuffer');
    return parent || this;
  },

  remove: function() {
    this.replaceWithBuffer(null);
  },

  /**
    @returns {DOMElement} The element corresponding to the generated HTML
      of this buffer
  */
  element: function() {
    return SC.$(this.string())[0];
  },

  /**
    Generates the HTML content for this buffer.

    @returns {String} The generated HTMl
  */
  string: function() {
    var id = get(this, 'elementId'),
        classes = get(this, 'elementClasses'),
        attrs = get(this, 'elementAttributes'),
        style = get(this, 'elementStyle'),
        tag = get(this, 'elementTag'),
        content = '',
        styleBuffer = [], prop;

    if (tag) {
      var openTag = ["<" + tag];

      if (id) { openTag.push('id="' + id + '"'); }
      if (classes.length) { openTag.push('class="' + classes.join(" ") + '"'); }

      if (!jQuery.isEmptyObject(style)) {
        for (prop in style) {
          if (style.hasOwnProperty(prop)) {
            styleBuffer.push(prop + ':' + style[prop] + ';');
          }
        }

        openTag.push('style="' + styleBuffer.join("") + '"');
      }

      for (prop in attrs) {
        if (attrs.hasOwnProperty(prop)) {
          openTag.push(prop + '="' + attrs[prop] + '"');
        }
      }

      openTag = openTag.join(" ") + '>';
    }

    var childBuffers = get(this, 'childBuffers');

    childBuffers.forEach(function(buffer) {
      var stringy = typeof buffer === 'string';
      content += (stringy ? buffer : buffer.string());
    });

    if (tag) {
      return openTag + content + "</" + tag + ">";
    } else {
      return content;
    }
  }

});
