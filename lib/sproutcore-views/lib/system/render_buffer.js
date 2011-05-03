// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.RenderBuffer = function(tagName) {
  return SC._RenderBuffer.create({ elementTag: tagName });
};

SC._RenderBuffer = SC.Object.extend(
  /** @scope SC.RenderBuffer.prototype */ {

  elementClasses: null,
  elementId: null,
  elementAttributes: null,
  elementContent: null,
  elementTag: null,
  parentBuffer: null,

  init: function() {
    sc_super();

    this.set('elementClasses', []);
    this.set('elementAttributes', {});
    this.set('elementContent', []);
  },

  push: function(string) {
    this.get('elementContent').push(string);
  },

  addClass: function(className) {
    this.get('elementClasses').pushObject(className);
  },

  id: function(id) {
    this.set('elementId', id);
  },

  attr: function(name, value) {
    this.get('elementAttributes')[name] = value;
  },

  begin: function(tagName) {
    return SC._RenderBuffer.create({
      parentBuffer: this,
      elementTag: tagName
    });
  },

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

  element: function() {
    return SC.$(this.string())[0];
  },

  string: function() {
    var id = this.get('elementId'),
        classes = this.get('elementClasses'),
        attrs = this.get('elementAttributes'),
        content = this.get('elementContent'),
        tag = this.get('elementTag');

    var openTag = ["<" + tag];

    if (id) { openTag.push('id="' + id + '"'); }
    if (classes.length) { openTag.push('classes="' + classes.join(" ") + '"'); }

    for (var prop in attrs) {
      if (attrs.hasOwnProperty(prop)) {
        openTag.push(prop + '="' + attrs[prop] + '"');
      }
    }

    openTag = openTag.join(" ");

    return openTag + content.join() + "</" + tag + ">";
  }
});
