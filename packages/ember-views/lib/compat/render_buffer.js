/**
@module ember
@submodule ember-views
*/

import jQuery from 'ember-views/system/jquery';
import Ember from 'ember-metal/core';
import { normalizeProperty } from 'dom-helper/prop';
import { canSetNameOnInputs } from 'ember-views/system/platform';

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
// may bend the official spec a bit, and is only needed for Handlebars
// templates.
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#optional-tags
// describes which tags are omittable. The spec for tbody and colgroup
// explains this behavior:
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-tbody-element
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-colgroup-element
//
var omittedStartTagChildren;
var omittedStartTagChildTest = /(?:<script)*.*?<([\w:]+)/i;

function detectOmittedStartTag(dom, string, contextualElement) {
  omittedStartTagChildren = omittedStartTagChildren || {
    tr: dom.createElement('tbody'),
    col: dom.createElement('colgroup')
  };

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
  this.seen = Object.create(null);
  this.list = [];
}

ClassSet.prototype = {
  add(string) {
    if (this.seen[string] === true) { return; }
    this.seen[string] = true;

    this.list.push(string);
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
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#x27;',
    '`': '&#x60;'
  };

  var escapeChar = function(chr) {
    return escape[chr] || '&amp;';
  };

  var string = value.toString();

  if (!POSSIBLE_CHARS_REGEXP.test(string)) { return string; }
  return string.replace(BAD_CHARS_REGEXP, escapeChar);
}

export function renderComponentWithBuffer(component, contextualElement, dom) {
  var buffer = [];
  component.render(buffer);
  var element = dom.parseHTML(buffer.join(''), contextualElement);
  return element;
}

/**
  `Ember.RenderBuffer` gathers information regarding the view and generates the
  final representation. `Ember.RenderBuffer` will generate HTML which can be pushed
  to the DOM.

   ```javascript
   var buffer = new Ember.RenderBuffer('div', contextualElement);
  ```

  @class RenderBuffer
  @namespace Ember
  @deprecated
  @private
*/

export default function RenderBuffer(domHelper) {
  Ember.deprecate('`Ember.RenderBuffer` is deprecated.');
  this.buffer = null;
  this.childViews = [];
  this.attrNodes = [];

  Ember.assert('RenderBuffer requires a DOM helper to be passed to its constructor.', !!domHelper);

  this.dom = domHelper;

  this.tagName = undefined;
  this.buffer = null;
  this._element = null;
  this._outerContextualElement = undefined;
  this.elementClasses = null;
  this.elementId = null;
  this.elementAttributes = null;
  this.elementProperties = null;
  this.elementTag = null;
  this.elementStyle = null;
}

RenderBuffer.prototype = {

  reset(tagName, contextualElement) {
    this.tagName = tagName;
    this.buffer = null;
    this._element = null;
    this._outerContextualElement = contextualElement;
    this.elementClasses = null;
    this.elementId = null;
    this.elementAttributes = null;
    this.elementProperties = null;
    this.elementTag = null;
    this.elementStyle = null;
    this.childViews.length = 0;
    this.attrNodes.length = 0;
  },

  // The root view's element
  _element: null,

  // The root view's contextualElement
  _outerContextualElement: null,

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
    @private
  */
  classes: null,

  /**
    The id in of the element, to be applied in the id attribute.

    You should not set this property yourself, rather, you should use
    the `id()` method of `Ember.RenderBuffer`.

    @property elementId
    @type String
    @default null
    @private
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
    @private
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
    @private
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
    @private
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
    @private
  */
  elementStyle: null,

  pushChildView(view) {
    var index = this.childViews.length;
    this.childViews[index] = view;
    this.push('<script id=\'morph-'+index+'\' type=\'text/x-placeholder\'>\x3C/script>');
  },

  pushAttrNode(node) {
    var index = this.attrNodes.length;
    this.attrNodes[index] = node;
  },

  hydrateMorphs(contextualElement) {
    var childViews = this.childViews;
    var el = this._element;
    for (var i=0,l=childViews.length; i<l; i++) {
      var childView = childViews[i];
      var ref = el.querySelector('#morph-'+i);

      Ember.assert('An error occurred while setting up template bindings. Please check ' +
                   (((childView && childView.parentView && childView._parentView._debugTemplateName ? '"' + childView._parentView._debugTemplateName + '" template ' : ''))
                   )  + 'for invalid markup or bindings within HTML comments.',
                   ref);

      var parent = ref.parentNode;

      childView._morph = this.dom.insertMorphBefore(
        parent,
        ref,
        parent.nodeType === 1 ? parent : contextualElement
      );
      parent.removeChild(ref);
    }
  },

  /**
    Adds a string of HTML to the `RenderBuffer`.

    @method push
    @param {String} string HTML to push into the buffer
    @chainable
    @private
  */
  push(content) {
    if (typeof content === 'string') {
      if (this.buffer === null) {
        this.buffer = '';
      }
      Ember.assert('A string cannot be pushed into the buffer after a fragment', !this.buffer.nodeType);
      this.buffer += content;
    } else {
      Ember.assert('A fragment cannot be pushed into a buffer that contains content', !this.buffer);
      this.buffer = content;
    }
    return this;
  },

  /**
    Adds a class to the buffer, which will be rendered to the class attribute.

    @method addClass
    @param {String} className Class name to add to the buffer
    @chainable
    @private
  */
  addClass(className) {
    // lazily create elementClasses
    this.elementClasses = (this.elementClasses || new ClassSet());
    this.elementClasses.add(className);
    this.classes = this.elementClasses.list;

    return this;
  },

  setClasses(classNames) {
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
    @private
  */
  id(id) {
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
    @private
  */
  attr(name, value) {
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
    @private
  */
  removeAttr(name) {
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
    @private
  */
  prop(name, value) {
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
    @private
  */
  removeProp(name) {
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
    @private
  */
  style(name, value) {
    this.elementStyle = (this.elementStyle || {});

    this.elementStyle[name] = value;
    return this;
  },

  generateElement() {
    var tagName = this.tagName;
    var id = this.elementId;
    var classes = this.classes;
    var attrs = this.elementAttributes;
    var props = this.elementProperties;
    var style = this.elementStyle;
    var styleBuffer = '';
    var attr, prop, tagString;

    if (!canSetNameOnInputs && attrs && attrs.name) {
      // IE allows passing a tag to createElement. See note on `canSetNameOnInputs` above as well.
      tagString = `<${stripTagName(tagName)} name="${escapeAttribute(attrs.name)}">`;
    } else {
      tagString = tagName;
    }

    var element = this.dom.createElement(tagString, this.outerContextualElement());

    if (id) {
      this.dom.setAttribute(element, 'id', id);
      this.elementId = null;
    }
    if (classes) {
      this.dom.setAttribute(element, 'class', classes.join(' '));
      this.classes = null;
      this.elementClasses = null;
    }

    if (style) {
      for (prop in style) {
        styleBuffer += (prop + ':' + style[prop] + ';');
      }

      this.dom.setAttribute(element, 'style', styleBuffer);

      this.elementStyle = null;
    }

    if (attrs) {
      for (attr in attrs) {
        this.dom.setAttribute(element, attr, attrs[attr]);
      }

      this.elementAttributes = null;
    }

    if (props) {
      for (prop in props) {
        var { normalized } = normalizeProperty(element, prop);

        this.dom.setPropertyStrict(element, normalized, props[prop]);
      }

      this.elementProperties = null;
    }

    return this._element = element;
  },

  /**
    @method element
    @return {DOMElement} The element corresponding to the generated HTML
      of this buffer
    @private
  */
  element() {

    if (this._element && this.attrNodes.length > 0) {
      var i, l, attrMorph, attrNode;
      for (i=0, l=this.attrNodes.length; i<l; i++) {
        attrNode = this.attrNodes[i];
        attrMorph = this.dom.createAttrMorph(this._element, attrNode.attrName);
        attrNode._morph = attrMorph;
      }
    }

    var content = this.innerContent();
    // No content means a text node buffer, with the content
    // in _element. Ember._BoundView is an example.
    if (content === null) {
      return this._element;
    }

    var contextualElement = this.innerContextualElement(content);
    this.dom.detectNamespace(contextualElement);

    if (!this._element) {
      this._element = this.dom.createDocumentFragment();
    }

    if (content.nodeType) {
      this._element.appendChild(content);
    } else {
      var frag = this.dom.parseHTML(content, contextualElement);
      this._element.appendChild(frag);
    }

    // This should only happen with legacy string buffers
    if (this.childViews.length > 0) {
      this.hydrateMorphs(contextualElement);
    }

    return this._element;
  },

  /**
    Generates the HTML content for this buffer.

    @method string
    @return {String} The generated HTML
    @private
  */
  string() {
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

  outerContextualElement() {
    if (this._outerContextualElement === undefined) {
      Ember.deprecate('The render buffer expects an outer contextualElement to exist.' +
                      ' This ensures DOM that requires context is correctly generated (tr, SVG tags).' +
                      ' Defaulting to document.body, but this will be removed in the future');
      this.outerContextualElement = document.body;
    }
    return this._outerContextualElement;
  },

  innerContextualElement(html) {
    var innerContextualElement;
    if (this._element && this._element.nodeType === 1) {
      innerContextualElement = this._element;
    } else {
      innerContextualElement = this.outerContextualElement();
    }

    var omittedStartTag;
    if (html) {
      omittedStartTag = detectOmittedStartTag(this.dom, html, innerContextualElement);
    }
    return omittedStartTag || innerContextualElement;
  },

  innerString() {
    var content = this.innerContent();
    if (content && !content.nodeType) {
      return content;
    }
  },

  innerContent() {
    return this.buffer;
  }
};
