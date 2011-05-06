// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  TODO Document SC.RenderBuffer class itself
*/

/**
  @class
  @extends SC.Object
*/
SC.RenderBuffer = function(tagName) {
  return SC._RenderBuffer.create({ elementTag: tagName });
};

SC._RenderBuffer = SC.Object.extend(
  /** @scope SC.RenderBuffer.prototype */ {

  /**
    @type Array
    @default []
  */
  elementClasses: null,

  /**
    @type String
    @default null
  */
  elementId: null,

  /**
    @type Hash
    @default {}
  */
  elementAttributes: null,

  /**
    @type Array
    @default []
  */
  elementContent: null,

  /**
    @type String
    @default null
  */
  elementTag: null,

  /**
    @type Hash
    @default {}
  */
  elementStyle: null,

  /**
    @type SC.RenderBuffer
    @default null
  */
  parentBuffer: null,

  /** @private */
  init: function() {
    sc_super();

    this.set('elementClasses', []);
    this.set('elementAttributes', {});
    this.set('elementStyle', {});
    this.set('elementContent', []);
  },

  /**
    Adds a string of HTML to the RenderBuffer.

    @param {String} string HTML to push into the buffer
    @returns {SC.RenderBuffer} this
  */
  push: function(string) {
    this.get('elementContent').push(string);
    return this;
  },

  /**
    Adds a class to the buffer, which will be rendered to the class attribute.

    @param {String} className Class name to add to the buffer
    @returns {SC.RenderBuffer} this
  */
  addClass: function(className) {
    this.get('elementClasses').pushObject(className);
    return this;
  },

  /**
    Sets the elementID to be used for the element.

    @param {Strign} id
    @returns {SC.RenderBuffer} this
  */
  id: function(id) {
    this.set('elementId', id);
    return this;
  },

  /**
    Adds an attribute which will be rendered to the element.

    @param {String} name The name of the attribute
    @param {String} value The value to add to the attribute
    @returns {SC.RenderBuffer} this
  */
  attr: function(name, value) {
    this.get('elementAttributes')[name] = value;
    return this;
  },

  /**
    Adds a style to the style attribute which will be rendered to the element.

    @param {String} name Name of the style
    @param {String} value
    @returns {SC.RenderBuffer} this
  */
  style: function(name, value) {
    this.get('elementStyle')[name] = value;
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
    var parent = this.get('parentBuffer');

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
    var id = this.get('elementId'),
        classes = this.get('elementClasses'),
        attrs = this.get('elementAttributes'),
        style = this.get('elementStyle'),
        content = this.get('elementContent'),
        tag = this.get('elementTag'),
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

      openTag.push('style="' + styleBuffer.join() + '"');
    }

    for (prop in attrs) {
      if (attrs.hasOwnProperty(prop)) {
        openTag.push(prop + '="' + attrs[prop] + '"');
      }
    }
    openTag.push('>');

    openTag = openTag.join(" ");

    return openTag + content.join() + "</" + tag + ">";
  }

});
