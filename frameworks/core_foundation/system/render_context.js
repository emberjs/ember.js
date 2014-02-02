// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/builder');

/** set update mode on context to replace content (preferred) */
SC.MODE_REPLACE = 'replace';

/** set update mode on context to append content */
SC.MODE_APPEND = 'append';

/** set update mode on context to prepend content */
SC.MODE_PREPEND = 'prepend';

/** list of numeric properties that should not have 'px' appended */
SC.NON_PIXEL_PROPERTIES = ['zIndex', 'opacity'];

/** a list of styles that get expanded into multiple properties, add more as you discover them */
SC.COMBO_STYLES = {
  WebkitTransition: ['WebkitTransitionProperty', 'WebkitTransitionDuration', 'WebkitTransitionDelay', 'WebkitTransitionTimingFunction']
};

/**
  @namespace

  A RenderContext is a builder that can be used to generate HTML for views or
  to update an existing element.  Rather than making changes to an element
  directly, you use a RenderContext to queue up changes to the element,
  finally applying those changes or rendering the new element when you are
  finished.

  You will not usually create a render context yourself but you will be passed
  a render context as the first parameter of your render() method on custom
  views.

  Render contexts are essentially arrays of strings.  You can add a string to
  the context by calling push().  You can retrieve the entire array as a
  single string using join().  This is basically the way the context is used
  for views.  You are passed a render context and expected to add strings of
  HTML to the context like a normal array.  Later, the context will be joined
  into a single string and converted into real HTML for display on screen.

  In addition to the core push and join methods, the render context also
  supports some extra methods that make it easy to build tags.

  context.begin() <-- begins a new tag context
  context.end() <-- ends the tag context...
*/
SC.RenderContext = SC.Builder.create(
  /** @lends SC.RenderContext */ {

  SELF_CLOSING: SC.CoreSet.create().addEach(['area', 'base', 'basefront', 'br', 'hr', 'input', 'img', 'link', 'meta']),

  /**
    When you create a context you should pass either a tag name or an element
    that should be used as the basis for building the context.  If you pass
    an element, then the element will be inspected for class names, styles
    and other attributes.  You can also call update() or replace() to
    modify the element with you context contents.

    If you do not pass any parameters, then we assume the tag name is 'div'.

    A second parameter, parentContext, is used internally for chaining.  You
    should never pass a second argument.

    @param {String|DOMElement} tagNameOrElement
    @returns {SC.RenderContext} receiver
  */
  init: function (tagNameOrElement, prevContext) {
    var tagNameOrElementIsString;

    // if a prevContext was passed, setup with that first...
    if (prevContext) {
      this.prevObject = prevContext;
      this.strings    = prevContext.strings;
      this.offset     = prevContext.length + prevContext.offset;
    }

    if (!this.strings) this.strings = [];

    // if tagName is string, just setup for rendering new tagName
    if (tagNameOrElement === undefined) {
      tagNameOrElement = 'div';
      tagNameOrElementIsString = YES;
    }
    else if (tagNameOrElement === 'div'  ||  tagNameOrElement === 'label'  ||  tagNameOrElement === 'a') {
      // Fast path for common tags.
      tagNameOrElementIsString = YES;
    }
    else if (SC.typeOf(tagNameOrElement) === SC.T_STRING) {
      tagNameOrElement = tagNameOrElement.toLowerCase();
      tagNameOrElementIsString = YES;
    }

    if (tagNameOrElementIsString) {
      this._tagName     = tagNameOrElement;
      this._needsTag    = YES; // used to determine if end() needs to wrap tag
      this.needsContent = YES;

      // increase length of all contexts to leave space for opening tag
      var c = this;
      while (c) { c.length++; c = c.prevObject; }

      this.strings.push(null);
      this._selfClosing = this.SELF_CLOSING.contains(tagNameOrElement);
    } else {
      this._elem        = tagNameOrElement;
      this._needsTag    = NO;
      this.length       = 0;
      this.needsContent = NO;
    }
    return this;
  },

  // ..........................................................
  // PROPERTIES
  //

  // NOTE: We store this as an actual array of strings so that browsers that
  // support dense arrays will use them.
  /**
    The current working array of strings.

    @type Array
  */
  strings: null,

  /**
    this initial offset into the strings array where this context instance
    has its opening tag.

    @type Number
  */
  offset: 0,

  /**
    the current number of strings owned by the context, including the opening
    tag.

    @type Number
  */
  length: 0,

  /**
    Specify the method that should be used to update content on the element.
    In almost all cases you want to replace the content.  Very carefully
    managed code (such as in CollectionView) can append or prepend content
    instead.

    You probably do not want to change this property unless you know what you
    are doing.

    @type String
  */
  updateMode: SC.MODE_REPLACE,

  /**
    YES if the context needs its content filled in, not just its outer
    attributes edited.  This will be set to YES anytime you push strings into
    the context or if you don't create it with an element to start with.
  */
  needsContent: NO,

  // ..........................................................
  // CORE STRING API
  //

  /**
    Returns the string at the designated index.  If you do not pass anything
    returns the string array.  This index is an offset from the start of the
    strings owned by this context.

    @param {Number} idx the index
    @returns {String|Array}
  */
  get: function (idx) {
    var strings = this.strings || [];
    return (idx === undefined) ? strings.slice(this.offset, this.length) : strings[idx + this.offset];
  },

  /** @deprecated */
  html: function (line) {
    //@if(debug)
    SC.warn("Developer Warning: SC.RenderContext:html() is no longer used to push HTML strings.  Please use `push()` instead.");
    //@endif
    return this.push(line);
  },

  /**
    Adds a string to the render context for later joining and insertion.  To
    HTML escape the string, see the similar text() method instead.

    Note: You can pass multiple string arguments to this method and each will
    be pushed.

    When used in render() for example,

        MyApp.MyView = SC.View.extend({

          innerText: '',

          render: function (context) {
            var innerText = this.get('innerText');

            // This will be pushed into the DOM all at once.
            context.push('<div class="inner-div">', innerText, '<span class="inner-span">**</span></div>');
          }

        });

    @param {String} line the HTML to add to the context
    @returns {SC.RenderContext} receiver
  */
  push: function (line) {
    var strings = this.strings, len = arguments.length;
    if (!strings) this.strings = strings = []; // create array lazily

    if (len > 1) {
      strings.push.apply(strings, arguments);
    } else {
      strings.push(line);
    }

    // adjust string length for context and all parents...
    var c = this;
    while (c) { c.length += len; c = c.prevObject; }

    this.needsContent = YES;

    return this;
  },

  /**
    Pushes the passed string to the render context for later joining and
    insertion, but first escapes the string to ensure that no user-entered HTML
    is processed as HTML.  To push the string without escaping, see the similar
    push() method instead.

    Note: You can pass multiple string arguments to this method and each will
    be escaped and pushed.

    When used in render() for example,

        MyApp.MyView = SC.View.extend({

          userText: '<script src="http://maliciousscripts.com"></script>',

          render: function (context) {
            var userText = this.get('userText');

            // Pushes "&lt;script src="http://maliciousscripts.com"&gt;&lt;/script&gt;" in the DOM
            context.text(userText);
          }

        });

    @param {String} line the text to add to the context
    @returns {SC.RenderContext} receiver
  */
  text: function () {
    var len = arguments.length,
      idx = 0;

    for (idx = 0; idx < len; idx++) {
      this.push(SC.RenderContext.escapeHTML(arguments[idx]));
    }

    return this;
  },

  /**
    Joins the strings together, closes any open tags and returns the final result.

    @param {String} joinChar optional string to use in joins. def empty string
    @returns {String} joined string
  */
  join: function (joinChar) {
    // generate tag if needed...
    if (this._needsTag) this.end();

    var strings = this.strings;
    return strings ? strings.join(joinChar || '') : '';
  },

  // ..........................................................
  // GENERATING
  //

  /**
    Begins a new render context based on the passed tagName or element.
    Generate said context using end().

    @returns {SC.RenderContext} new context
  */
  begin: function (tagNameOrElement) {
    return SC.RenderContext(tagNameOrElement, this);
  },

  /**
    If the current context targets an element, this method returns the
    element.  If the context does not target an element, this method will
    render the context into an offscreen element and return it.

    @returns {DOMElement} the element
  */
  element: function () {
    return this._elem ? this._elem : SC.$(this.join())[0];
  },

  /**
    Removes an element with the passed id in the currently managed element.
  */
  remove: function (elementId) {
    if (!elementId) return;

    var el, elem = this._elem;
    if (!elem || !elem.removeChild) return;

    el = document.getElementById(elementId);
    if (el) {
      el = elem.removeChild(el);
      el = null;
    }
  },

  /**
    If an element was set on this context when it was created, this method
    will actually apply any changes to the element itself.  If you have not
    written any inner html into the context, then the innerHTML of the
    element will not be changed, otherwise it will be replaced with the new
    innerHTML.

    Also, any attributes, id, classNames or styles you've set will be
    updated as well.  This also ends the editing context session and cleans
    up.

    @returns {SC.RenderContext} previous context or null if top
  */
  update: function () {
    var elem = this._elem,
        mode = this.updateMode,
        cq, value, factory, cur, next;

    // this._innerHTMLReplaced = NO;

    if (!elem) {
      // throw new Error("Cannot update context because there is no source element");
      return;
    }

    cq = this.$();

    // replace innerHTML
    if (this.length > 0) {
      // this._innerHTMLReplaced = YES;
      if (mode === SC.MODE_REPLACE) {
        cq.html(this.join());
      } else {
        factory = elem.cloneNode(false);
        factory.innerHTML = this.join();
        cur = factory.firstChild;
        while (cur) {
          next = cur.nextSibling;
          elem.insertBefore(cur, next);
          cur = next;
        }
        cur = next = factory = null; // cleanup
      }
    }

    // attributes, styles, and class names will already have been set.

    // id="foo"
    if (this._idDidChange && (value = this._id)) {
      cq.attr('id', value);
    }

    // now cleanup element...
    elem = this._elem = null;
    return this.prevObject || this;
  },

  // these are temporary objects are reused by end() to avoid memory allocs.
  _DEFAULT_ATTRS: {},

  /**
    Ends the current tag editing context.  This will generate the tag string
    including any attributes you might have set along with a closing tag.

    The generated HTML will be added to the render context strings.  This will
    also return the previous context if there is one or the receiver.

    If you do not have a current tag, this does nothing.

    @returns {SC.RenderContext}
  */
  end: function () {
    // NOTE: If you modify this method, be careful to consider memory usage
    // and performance here.  This method is called frequently during renders
    // and we want it to be as fast as possible.

    // generate opening tag.

    // get attributes first.  Copy in className + styles...
    var tag = '', styleStr = '', key, value,
        attrs = this._attrs, className = this._classes,
        id = this._id, styles = this._styles, strings, selfClosing;

    // add tag to tag array
    tag = '<' + this._tagName;

    // add any attributes...
    if (attrs || className || styles || id) {
      if (!attrs) attrs = this._DEFAULT_ATTRS;
      if (id) attrs.id = id;
      // old versions of safari (5.0)!!!! throw an error if we access
      // attrs.class. meh...
      if (className) attrs['class'] = className.join(' ');

      // add in styles.  note how we avoid memory allocs here to keep things
      // fast...
      if (styles) {
        for (key in styles) {
          if (!styles.hasOwnProperty(key)) continue;
          value = styles[key];
          if (value === null) continue; // skip empty styles
          if (typeof value === SC.T_NUMBER && !SC.NON_PIXEL_PROPERTIES.contains(key)) value += "px";
          styleStr = styleStr + this._dasherizeStyleName(key) + ": " + value + "; ";
        }
        attrs.style = styleStr;
      }

      // now convert attrs hash to tag array...
      tag = tag + ' '; // add space for joining0
      for (key in attrs) {
        if (!attrs.hasOwnProperty(key)) continue;
        value = attrs[key];
        if (value === null) continue; // skip empty attrs
        tag = tag + key + '="' + value + '" ';
      }

      // if we are using the DEFAULT_ATTRS temporary object, make sure we
      // reset.
      if (attrs === this._DEFAULT_ATTRS) {
        delete attrs.style;
        delete attrs['class'];
        delete attrs.id;
      }

    }

    // this is self closing if there is no content in between and selfClosing
    // is not set to false.
    strings = this.strings;
    selfClosing = (this._selfClosing === NO) ? NO : (this.length === 1);
    tag = tag + (selfClosing ? ' />' : '>');

    strings[this.offset] = tag;

    // now generate closing tag if needed...
    if (!selfClosing) {
      strings.push('</' + this._tagName + '>');

      // increase length of receiver and all parents
      var c = this;
      while (c) { c.length++; c = c.prevObject; }
    }

    // if there was a source element, cleanup to avoid memory leaks
    this._elem = null;
    return this.prevObject || this;
  },

  /**
    Generates a tag with the passed options.  Like calling context.begin().end().

    @param {String} tagName optional tag name.  default 'div'
    @param {Hash} opts optional tag options.  defaults to empty options.
    @returns {SC.RenderContext} receiver
  */
  tag: function (tagName, opts) {
    return this.begin(tagName, opts).end();
  },

  // ..........................................................
  // BASIC HELPERS
  //

  /**
    Reads outer tagName if no param is passed, sets tagName otherwise.

    @param {String} tagName pass to set tag name.
    @returns {String|SC.RenderContext} tag name or receiver
  */
  tagName: function (tagName) {
    if (tagName === undefined) {
      if (!this._tagName && this._elem) this._tagName = this._elem.tagName;
      return this._tagName;
    } else {
      this._tagName = tagName;
      this._tagNameDidChange = YES;
      return this;
    }
  },

  /**
    Reads the outer tag id if no param is passed, sets the id otherwise.

    @param {String} idName the id or set
    @returns {String|SC.RenderContext} id or receiver
  */
  id: function (idName) {
    if (idName === undefined) {
      if (!this._id && this._elem) this._id = this._elem.id;
      return this._id;
    } else {
      this._id = idName;
      this._idDidChange = YES;
      return this;
    }
  },

  // ..........................................................
  // CSS CLASS NAMES SUPPORT
  //

  /** @deprecated */
  classNames: function (deprecatedArg) {
    if (deprecatedArg) {
      //@if(debug)
      SC.warn("Developer Warning: SC.RenderContext:classNames() (renamed to classes()) is no longer used to set classes, only to retrieve them.  Please use `setClass()` instead.");
      //@endif
      return this.setClass(deprecatedArg);
    } else {
      //@if(debug)
      SC.warn("Developer Warning: SC.RenderContext:classNames() has been renamed to classes() to better match the API of setClass() and resetClasses().  Please use `classes()` instead.");
      //@endif
      return this.classes();
    }
  },

  /**
    Retrieves the class names for the current context.

    @returns {Array} classNames array
  */
  classes: function () {
    if (!this._classes) {
      if (this._elem) {
        // Get the classes from the element.
        var attr = this.$().attr('class');

        if (attr && (attr = attr.toString()).length > 0) {
          this._classes = attr.split(/\s/);
        } else {
          // No class on the element.
          this._classes = [];
        }
      } else {
        this._classes = [];
      }
    }

    return this._classes;
  },

  /**
    Adds a class or classes to the current context.

    This is a convenience method that simply calls setClass(nameOrClasses, YES).

    @param {String|Array} nameOrClasses a class name or an array of class names
    @returns {SC.RenderContext} receiver
  */
  addClass: function (nameOrClasses) {
    // Convert arrays into objects for use by setClass
    if (SC.typeOf(nameOrClasses) === SC.T_ARRAY) {
      for (var i = 0, length = nameOrClasses.length, obj = {}; i < length; i++) {
        obj[nameOrClasses[i]] = YES;
      }
      nameOrClasses = obj;
    }

    return this.setClass(nameOrClasses, YES);
  },

  /**
    Removes the specified class name from the current context.

    This is a convenience method that simply calls setClass(name, NO).

    @param {String} name the class to remove
    @returns {SC.RenderContext} receiver
  */
  removeClass: function (name) {
    return this.setClass(name, NO);
  },

  /**
    Sets or unsets class names on the current context.

    You can either pass a single class name and a boolean indicating whether
    the value should be added or removed, or you can pass a hash with all
    the class names you want to add or remove with a boolean indicating
    whether they should be there or not.

    When used in render() for example,

        MyApp.MyView = SC.View.extend({

          isAdministrator: NO,

          render: function (context) {
            var isAdministrator = this.get('isAdministrator');

            // Sets the 'is-admin' class appropriately.
            context.setClass('is-admin', isAdministrator);
          }

        });

    @param {String|Hash} nameOrClasses either a single class name or a hash of class names with boolean values indicating whether to add or remove the class
    @param {Boolean} shouldAdd if a single class name for nameOrClasses is passed, this
    @returns {SC.RenderContext} receiver
  */
  setClass: function (nameOrClasses, shouldAdd) {
    var didChange = NO,
      classes = this.classes();

    // Add the updated classes to the internal classes object.
    if (SC.typeOf(nameOrClasses) === SC.T_ARRAY) {
      //@if(debug)
      SC.warn("Developer Warning: SC.RenderContext:setClass() should not be passed an array of class names.  To remain compatible with calls to the deprecated classNames() function, all classes on the current context will be replaced with the given array, but it would be more accurate in the future to call resetClasses() and addClass() or setClass(hash) instead.  Please update your code accordingly.");
      //@endif
      this.resetClasses();
      classes = this.classes();

      for (var i = 0, length = nameOrClasses.length; i < length; i++) {
        didChange = this._setClass(classes, nameOrClasses[i], YES) || didChange;
      }
    } else if (SC.typeOf(nameOrClasses) === SC.T_HASH) {
      for (var name in nameOrClasses) {
        if (!nameOrClasses.hasOwnProperty(name)) continue;

        shouldAdd = nameOrClasses[name];
        didChange = this._setClass(classes, name, shouldAdd) || didChange;
      }
    } else {
      didChange = this._setClass(classes, nameOrClasses, shouldAdd);
    }

    if (didChange) {
      this._classesDidChange = YES;

      // Apply the styles to the element if we have one already.
      if (this._elem) {
        this.$().attr('class', classes.join(' '));
      }
    }

    return this;
  },

  /** @private */
  _setClass: function (classes, name, shouldAdd) {
    var didChange = NO,
      idx;

    idx = classes.indexOf(name);
    if (idx >= 0 && !shouldAdd) {
      classes.splice(idx, 1);
      didChange = YES;
    } else if (idx < 0 && shouldAdd) {
      classes.push(name);
      didChange = YES;
    }

    return didChange;
  },

  /**
    Returns YES if the outer tag current has the passed class name, NO
    otherwise.

    @param {String} name the class name
    @returns {Boolean}
  */
  hasClass: function (name) {
    if (this._elem) {
      return this.$().hasClass(name);
    }

    return this.classes().indexOf(name) >= 0;
  },

  /** @deprecated */
  resetClassNames: function () {
    //@if(debug)
    SC.warn("Developer Warning: SC.RenderContext:resetClassNames() has been renamed to resetClasses to better match the API of classes(GET) and setClass(SET).  Please use `resetClasses()` instead.");
    //@endif
    return this.resetClasses();
  },

  /**
    Removes all class names from the context.

    Be aware that setClass() only effects the class names specified.  If there
    are existing class names that are not modified by a call to setClass(), they
    will remain on the context.  For example, if you call addClass('a') and
    addClass('b') followed by setClass({ b:NO }), the 'b' class will be
    removed, but the 'a' class will be unaffected.

    If you want to call setClass() or addClass() to replace all classes, you
    should call this method first.

    @returns {SC.RenderContext} receiver
  */
  resetClasses: function () {
    var didChange = NO,
      classes = this.classes();

    // Check for changes.
    didChange = classes.length;

    // Reset.
    this._classes = [];
    if (didChange) {
      this._classesDidChange = YES;

      // Apply the styles to the element if we have one already.
      if (this._elem) {
        this.$().attr('class', '');
      }
    }

    return this;
  },

  // ..........................................................
  // CSS Styles Support
  //

  /** @private */
  _STYLE_REGEX: /-?\s*([^:\s]+)\s*:\s*([^;]+)\s*;?/g,

  /**
    Retrieves the current styles for the context.

    @returns {Object} styles hash
  */
  styles: function (deprecatedArg) {
    // Fast path!
    if (deprecatedArg) {
      //@if(debug)
      SC.warn("Developer Warning: SC.RenderContext:styles() is no longer used to set styles, only to retrieve them.  Please use `setStyle(%@)` instead.".fmt(deprecatedArg));
      //@endif
      return this.setStyle(deprecatedArg);
    }

    if (!this._styles) {
      if (this._elem) {
        // Get the styles from the element.
        var attr = this.$().attr('style');

        if (attr && (attr = attr.toString()).length > 0) {
          // Ensure attributes are lower case for IE
          if (SC.browser.name === SC.BROWSER.ie) {
            attr = attr.toLowerCase();
          }
          var styles = {},
            match,
            regex = this._STYLE_REGEX;

          regex.lastIndex = 0;
          while (match = regex.exec(attr)) {
            styles[this._camelizeStyleName(match[1])] = match[2];
          }

          this._styles = styles;
        } else {
          // No style on the element.
          this._styles = {};
        }
      } else {
        this._styles = {};
      }
    }

    return this._styles;
  },

  /**
    Adds the specified style to the current context.

    This is a convenience method that simply calls setStyle(nameOrStyles, value).

    @param {String|Object} nameOrStyles the name of a style or a hash of style names with values
    @param {String|Number} value style value if a single style name for nameOrStyles is passed
    @returns {SC.RenderContext} receiver
  */
  addStyle: function (nameOrStyles, value) {
    //@if(debug)
    // Notify when this function isn't being used properly (in debug mode only).
    /*jshint eqnull:true*/
    if (SC.typeOf(nameOrStyles) === SC.T_STRING && value == null) {
      SC.warn("Developer Warning: SC.RenderContext:addStyle is not meant to be used to remove attributes by setting the value to null or undefined.  It would be more correct to use setStyle(%@, %@).".fmt(nameOrStyles, value));
    }
    //@endif
    return this.setStyle(nameOrStyles, value);
  },

  /**
    Removes the specified style from the current context.

    This is a convenience method that simply calls setStyle(name, undefined).

    @param {String} styleName the name of the style to remove
    @returns {SC.RenderContext} receiver
  */
  removeStyle: function (styleName) {
    return this.setStyle(styleName);
  },

  /** @deprecated */
  css: function (nameOrStyles, value) {
    //@if(debug)
    SC.warn("Developer Warning: In order to simplify the API to a few core functions, SC.RenderContext:css() has been deprecated in favor of setStyle which performs the same function.  Please use `setStyle(%@, %@)` instead.".fmt(nameOrStyles, value));
    //@endif
    return this.setStyle(nameOrStyles, value);
  },

  /**
    Sets or unsets a style or styles on the context.

    Passing a value will set the value for the given style name, passing a null
    or undefined value will unset any current value for the given style name and
    remove it.

    Be aware that setStyle() only effects the styles specified.  If there
    are existing styles that are not modified by a call to setStyle(), they
    will remain on the context.  For example, if you call addStyle('margin-left', 10)
    and addStyle('margin-right', 10) followed by setClass({ 'margin-right': null }),
    the 'margin-right' style will be removed, but the 'margin-left' style will
    be unaffected.

    If you want to call setStyle() or addStyle() to replace all styles, you
    should call resetStyles() method first.

    When used in render() for example,

        MyApp.MyView = SC.View.extend({

          textColor: 'blue',

          // By default this syle will not appear since the value is null.
          fontFamily: null,

          render: function (context) {
            var textColor = this.get('textColor'),
              fontFamily = this.get('fontFamily');

            // Set the `color` and `fontFamily` styles.
            context.setStyle({
              color: textColor,
              fontFamily: fontFamily
            });
          }
        });

    @param {String|Object} nameOrStyles the name of a style or a hash of style names with values
    @param {String|Number} [value] style value if a single style name for nameOrStyles is passed
    @returns {SC.RenderContext} receiver
  */
  setStyle: function (nameOrStyles, value) {
    var didChange = NO,
      styles = this.styles();

    // Add the updated styles to the internal styles object.
    if (SC.typeOf(nameOrStyles) === SC.T_HASH) {
      for (var key in nameOrStyles) {
        if (!nameOrStyles.hasOwnProperty(key)) continue;

        value = nameOrStyles[key];

        didChange = this._deleteComboStyles(styles, key) || didChange;
        didChange = this._setOnHash(styles, key, value) || didChange;
      }
    } else {
      didChange = this._deleteComboStyles(styles, nameOrStyles);
      didChange = this._setOnHash(styles, nameOrStyles, value) || didChange;
    }

    if (didChange) {

      // Set the styles on the element if we have one already.
      if (this._elem) {
        // Note: jQuery .css doesn't remove old styles
        this.$().css(styles);
      }
    }

    return this;
  },

  /** @private */
  _deleteComboStyles: function (styles, key) {
    var comboStyles = SC.COMBO_STYLES[key],
        didChange = NO, tmp;

    if (comboStyles) {
      for (var idx = 0, idxLen = comboStyles.length; idx < idxLen; idx++) {
        tmp = comboStyles[idx];
        if (styles[tmp]) {
          delete styles[tmp];
          didChange = YES;
        }
      }
    }

    return didChange;
  },

  /** @private Sets or unsets the key:value on the hash and returns whether a change occurred. */
  _setOnHash: function (hash, key, value) {
    /*jshint eqnull:true*/
    var cur = hash[key],
      didChange = true;

    if (cur == null && value != null) {
      hash[key] = value;
    } else if (cur != null && value == null) {
      // Unset using '' so that jQuery will remove the value, null is not reliable (ex. WebkitTransform)
      hash[key] = '';
    } else if (cur != value) {
      hash[key] = value;
    } else {
      didChange = false;
    }

    return didChange;
  },

  /**
    Removes all styles from the context.

    Be aware that setStyle() only effects the styles specified.  If there
    are existing styles that are not modified by a call to setStyle(), they
    will remain on the context.  For example, if you call addStyle('margin-left', 10)
    and addStyle('margin-right', 10) followed by setClass({ 'margin-right': null }),
    the 'margin-right' style will be removed, but the 'margin-left' style will
    be unaffected.

    If you want to call setStyle() or addStyle() to replace all styles, you
    should call this method first.

    @returns {SC.RenderContext} receiver
   */
  resetStyles: function () {
    var didChange = NO,
      styles = this.styles();

    // Check for changes (i.e. are there any properties in the object).
    for (var key in styles) {
      if (!styles.hasOwnProperty(key)) continue;

      didChange = YES;
    }

    // Reset.
    this._styles = {};
    if (didChange) {
      // Apply the styles to the element if we have one already.
      if (this._elem) {
        this.$().attr('style', '');
      }
    }

    return this;
  },

  // ..........................................................
  // ARBITRARY ATTRIBUTES SUPPORT
  //

  /**
    Retrieves the current attributes for the context, less the class and style
    attributes.

    If you retrieve the attributes hash to edit it, you must pass the hash back
    to setAttr in order for it to be applied to the element on rendering.

    Use classes() or styles() to get those specific attributes.

    @returns {Object} attributes hash
  */
  attrs: function () {
    if (!this._attrs) {
      if (this._elem) {
        // Get the attributes from the element.
        var attrs = {},
          elAttrs = this._elem.attributes,
          length = elAttrs.length;

        for (var i = 0, attr, name; i < length; i++) {
          attr = elAttrs.item(i);
          name = attr.nodeName;
          if (name.match(/^(?!class|style).*$/i)) {
            attrs[name] = attr.nodeValue;
          }
        }

        this._attrs = attrs;
      } else {
        this._attrs = {};
      }
    }

    return this._attrs;
  },

  /** @deprecated */
  attr: function (nameOrAttrs, value) {
    // Fast path.
    if (nameOrAttrs) {

      if (SC.typeOf(nameOrAttrs) === SC.T_HASH || value !== undefined) {
        //@if(debug)
        SC.warn("Developer Warning: SC.RenderContext:attr() is no longer used to set attributes.  Please use `setAttr()` instead, which matches the API of setClass() and setStyle().");
        //@endif
        return this.setAttr(nameOrAttrs, value);
      } else {
        //@if(debug)
        SC.warn("Developer Warning: SC.RenderContext:attr() is no longer used to get an attribute.  Please use `attrs()` instead to retrieve the hash and check properties on it directly, which matches the API of classes() and styles().");
        //@endif
        return this.attrs()[nameOrAttrs];
      }
    }
    //@if(debug)
    SC.warn("Developer Warning: SC.RenderContext:attr() is no longer used to get attributes.  Please use `attrs()` instead, which matches the API of classes() and styles().");
    //@endif

    return this.attrs();
  },

  /**
    Adds the specified attribute to the current context.

    This is a convenience method that simply calls setAttr(nameOrAttrs, value).

    @param {String|Object} nameOrAttrs the name of an attribute or a hash of attribute names with values
    @param {String|Number} value attribute value if a single attribute name for nameOrAttrs is passed
    @returns {SC.RenderContext} receiver
  */
  addAttr: function (nameOrAttrs, value) {
    //@if(debug)
    // Notify when this function isn't being used properly (in debug mode only).
    /*jshint eqnull:true*/
    if (SC.typeOf(nameOrAttrs) === SC.T_STRING && value == null) {
      SC.warn("Developer Warning: SC.RenderContext:addAttr is not meant to be used to remove attributes by setting the value to null or undefined.  It would be more correct to use setAttr(%@, %@).".fmt(nameOrAttrs, value));
    }
    //@endif
    return this.setAttr(nameOrAttrs, value);
  },

  /**
    Removes the specified attribute from the current context.

    This is a convenience method that simply calls setAttr(name, undefined).

    @param {String} styleName the name of the attribute to remove
    @returns {SC.RenderContext} receiver
  */
  removeAttr: function (name) {
    //@if(debug)
    // Notify when this function isn't being used properly (in debug mode only).
    if (name.match(/^(class|style)$/i)) {
      SC.error("Developer Error: SC.RenderContext:removeAttr is not meant to be used to remove the style or class attribute.  You should use resetClasses() or resetStyles().");
    }
    //@endif

    return this.setAttr(name);
  },

  /**
    Sets or unsets an attribute or attributes on the context.  Passing a value
    will set the value for the given attribute name, passing a null or undefined
    value will unset any current value for the given attribute name and remove
    it.

    When used in render() for example,

        MyApp.MyView = SC.View.extend({

          // By default this syle will not appear since the value is null.
          title: null,

          render: function (context) {
            var title = this.get('title');

            // Set the `title` and `data-test` attributes.
            context.setAttr({
              title: title,
              'data-test': SC.buildMode === 'test'
            });
          }
        });

    @param {String|Object} nameOrAttrs the name of an attribute or a hash of attribute names with values
    @param {String} [value] attribute value if a single attribute name for nameOrAttrs is passed
    @returns {SC.RenderContext} receiver
  */
  setAttr: function (nameOrAttrs, value) {
    var didChange = NO,
      attrs = this.attrs(),
      key;

    //@if(debug)
    // Add some developer support to prevent improper use (in debug mode only).
    var foundImproperUse = NO;
    if (SC.typeOf(nameOrAttrs) === SC.T_HASH) {

      for (key in nameOrAttrs) {
        if (key.match(/^(class|style)$/i)) {
          foundImproperUse = YES;
        }
      }
    } else if (nameOrAttrs.match(/^(class|style)$/i)) {
      foundImproperUse = YES;
    }

    if (foundImproperUse) {
      SC.error("Developer Error: setAttr() is not meant to set class or style attributes.  Only classes and styles added with their relevant methods will be used.  Please use setClass() or setStyle().");
    }
    //@endif

    // Add the updated attrs to the internal attrs object.
    if (SC.typeOf(nameOrAttrs) === SC.T_HASH) {
      for (key in nameOrAttrs) {
        if (!nameOrAttrs.hasOwnProperty(key)) continue;

        value = nameOrAttrs[key];
        didChange = this._setOnHash(attrs, key, value) || didChange;
      }
    } else {
      didChange = this._setOnHash(attrs, nameOrAttrs, value);
    }

    if (didChange) {
      this._attrsDidChange = YES;

      // Apply the attrs to the element if we have one already.
      if (this._elem) {
        this.$().attr(nameOrAttrs, value);
      }
    }

    return this;
  },

  //
  // COREQUERY SUPPORT
  //
  /**
    Returns a CoreQuery instance for the element this context wraps (if
    it wraps any). If a selector is passed, the CoreQuery instance will
    be for nodes matching that selector.

    Renderers may use this to modify DOM.
   */
  $: function (sel) {
    var ret, elem = this._elem;
    ret = !elem ? SC.$([]) : (sel === undefined) ? SC.$(elem) : SC.$(sel, elem);
    elem = null;
    return ret;
  },


  /** @private
  */
  _camelizeStyleName: function (name) {
    // IE wants the first letter lowercase so we can allow normal behavior
    var needsCap = name.match(/^-(webkit|moz|o)-/),
        camelized = SC.String.camelize(name);

    if (needsCap) {
      return camelized.substr(0, 1).toUpperCase() + camelized.substr(1);
    } else {
      return camelized;
    }
  },

  /** @private
    Converts camelCased style names to dasherized forms
  */
  _dasherizeStyleName: function (name) {
    var dasherized = SC.String.dasherize(name);
    if (dasherized.match(/^(webkit|moz|ms|o)-/)) { dasherized = '-' + dasherized; }
    return dasherized;
  }

});

(function () {
  // this regex matches all <, > or &, unless & is immediately followed by at last 1 up to 7 alphanumeric
  // characters and a ;. For instance:
  // Some evil <script src="evil.js"> but this is legal &amp; these are not & &illegalese;
  // would become:
  // Some evil &lt;script src="evil.js"&gt; but this is legal &amp; these are not &amp; &amp;illegalese;
  var _escapeHTMLRegex = /[<>]|&(?![\d\w#]{1,7};)/g, _escapeHTMLMethod = function (match) {
    switch (match) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    }
  };

  /**
    Helper method escapes the passed string to ensure HTML is displayed as
    plain text while preserving HTML entities like &apos; , &agrave;, etc.
    You should make sure you pass all user-entered data through
    this method to avoid errors.  You can also do this with the text() helper
    method on a render context.

    @param {String|Number} text value to escape
    @returns {String} string with all HTML values properly escaped
  */
  SC.RenderContext.escapeHTML = function (text) {
    if (!text) return '';
    if (SC.typeOf(text) === SC.T_NUMBER) { text = text.toString(); }
    return text.replace(_escapeHTMLRegex, _escapeHTMLMethod);
  };
})();
