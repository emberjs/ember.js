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
  return SC._RenderBuffer.create({
    elementTag: tagName
  });
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
    An array of strings which defines the body of the element.

    You should not maintain this array yourself, rather, you should use
    the push() method of SC.RenderBuffer.

    @type Array
    @default []
  */
  elementContent: null,

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
    RenderBuffer supports plugging in escaping functionality via
    the boolean `escapeContent` property and the `escapeFunction`
    property.

    If `escapeContent` is set to true, the RenderBuffer will escape
    the value of the `elementContent` property when `string()` is
    called using `escapeFunction`, passing in the content.

    @type Boolean
  */
  escapeContent: false,

  /**
    If escapeContent is set to true, escapeFunction will be called
    to escape the content. Set this property to a function that
    takes a content string as its parameter, and return a sanitized
    string.
    
    @type Function
    @see SC.RenderBuffer.prototype.escapeContent
  */
  escapeFunction: null,

  /**
    Nested RenderBuffers will set this to their parent RenderBuffer
    instance.
 
    @type SC._RenderBuffer
  */
  parentBuffer: null,

  /** @private */
  init: function() {
    this._super();

    set(this ,'elementClasses', []);
    set(this, 'elementAttributes', {});
    set(this, 'elementStyle', {});
    set(this, 'elementContent', []);
  },

  /**
    Adds a string of HTML to the RenderBuffer.

    @param {String} string HTML to push into the buffer
    @returns {SC.RenderBuffer} this
  */
  push: function(string) {
    get(this, 'elementContent').pushObject(string);
    return this;
  },

  /**
    Adds a class to the buffer, which will be rendered to the class attribute.

    @param {String} className Class name to add to the buffer
    @returns {SC.RenderBuffer} this
  */
  addClass: function(className) {
    get(this, 'elementClasses').pushObject(className);
    return this;
  },

  /**
    Sets the elementID to be used for the element.

    @param {Strign} id
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
    Creates a new SC.RenderBuffer object with the provided tagName as
    the element tag and with its parentBuffer property set to the current
    SC.RenderBuffer.

    @param {String} tagName Tag name to use for the child buffer's element
    @returns {SC.RenderBuffer} A new RenderBuffer object
  */
  begin: function(tagName) {
    return SC._RenderBuffer.create({
      parentBuffer: this,
      elementTag: tagName
    });
  },

  /**
    Closes the current buffer and adds its content to the parentBuffer.

    @returns {SC.RenderBuffer} The parentBuffer, if one exists. Otherwise, this
  */
  end: function() {
    var parent = get(this, 'parentBuffer');

    if (parent) {
      var string = this.string();
      parent.push(string);
      return parent;
    } else {
      return this;
    }
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
        content = get(this, 'elementContent'),
        tag = get(this, 'elementTag'),
        styleBuffer = [], prop;

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

    content = content.join("");

    if (get(this, 'escapeContent')) {
      content = get(this, 'escapeFunction')(content);
    }

    return openTag + content + "</" + tag + ">";
  }

});
