// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class
  Represents a theme, and is also the core theme in which SC looks for
  other themes.

  If an SC.View has a theme of "ace", it will look in its parent's theme
  for the theme "ace". If there is no parent--that is, if the view is a
  frame--it will look in SC.Theme for the named theme. To find a theme,
  it calls find(themeName) on the theme.

  To be located, themes must be registered either as a root theme (by
  calling SC.Theme.addTheme) or as a child theme of another theme (by
  calling theTheme.addTheme).

  All themes are instances. However, new instances based on the current
  instance can always be created: just call .create(). This method is used
  by SC.View when you name a theme that doesn't actually exist: it creates
  a theme based on the parent theme.

  Locating Child Themes
  ----------------------------
  Locating child themes is relatively simple for the most part: it looks in
  its own "themes" property, which is an object inheriting from its parent's
  "themes" set, so it includes all parent themes.

  However, it does _not_ include global themes. This is because, when find()
  is called, it wants to ensure any child theme is specialized. That is, the
  child theme should include all class names of the base class theme. This only
  makes sense if the theme really is a child theme of the theme or one of its
  base classes; if the theme is a global theme, those class names should not
  be included.

  This makes sense logically as well, because when searching for a render delegate,
  it will locate it in any base theme that has it, but that doesn't mean
  class names from the derived theme shouldn't be included.

  @extends SC.Object
  @since SproutCore 1.1
  @author Alex Iskander
*/
SC.Theme = {
  /**
    Walks like a duck.
  */
  isTheme: YES,

  /**
    Class names for the theme.

    These class names include the name of the theme and the names
    of all parent themes. You can also add your own.
   */
  classNames: [],

  /**
    @private
    A helper to extend class names with another set of classnames. The
    other set of class names can be a hash, an array, a Set, or a space-
    delimited string.
  */
  _extend_class_names: function(classNames) {
    // class names may be a CoreSet, array, string, or hash
    if (classNames) {
      if (SC.typeOf(classNames) === SC.T_HASH && !classNames.isSet) {
        for (var className in classNames) {
          var index = this.classNames.indexOf(className);
          if (classNames[className] && index < 0) {
            this.classNames.push(className)
          } else if (index >= 0) {
            this.classNames.removeAt(index);
          }
        }
      } else {
        if (typeof classNames === "string") {
          //@if(debug)
          // There is no reason to support classNames as a String, it's just extra cases to have to support and makes for inconsistent code style.
          SC.warn("Developer Warning: The classNames of a Theme should be an Array.");
          //@endif
          classNames = classNames.split(' ');
        }

        //@if(debug)
        // There is no reason to support classNames as a Set, it's just extra cases to have to support and makes for inconsistent code style.
        if (classNames.isSet) {
          SC.warn("Developer Warning: The classNames of a Theme should be an Array.");
        }
        //@endif

        // it must be an array or a CoreSet...
        classNames.forEach(function (className) {
          if (!this.classNames.contains(className)) {
            this.classNames.push(className)
          }
        }, this);
      }
    }
  },

  /**
    @private
    Helper method that extends this theme with some extra properties.

    Used during Theme.create();
   */
  _extend_self: function(ext) {
    if (ext.classNames) this._extend_class_names(ext.classNames);

    // mixin while enabling sc_super();
    var key, value, cur;
    for (key in ext) {
      if (key === 'classNames') continue; // already handled.
      if (!ext.hasOwnProperty(key)) continue;

      value = ext[key];
      if (value instanceof Function && !value.base && (value !== (cur=this[key]))) {
        value.base = cur;
      }

      this[key] = value;
    }
  },

  /**
    Creates a new theme based on this one. The name of the new theme will
    be added to the classNames set.
  */
  create: function() {
    var result = SC.beget(this);
    result.baseTheme = this;

    // if we don't beget themes, the same instance would be shared between
    // all themes. this would be bad: imagine that we have two themes:
    // "Ace" and "Other." Each one has a "capsule" child theme. If they
    // didn't have their own child themes hash, the two capsule themes
    // would conflict.
    if (this.themes === SC.Theme.themes) {
      result.themes = {};
    } else {
      result.themes = SC.beget(this.themes);
    }

    // we also have private ("invisible") child themes; look at invisibleSubtheme
    // method.
    result._privateThemes = {};

    // also, the theme specializes all child themes as they are created
    // to ensure that all of the class names on this theme are included.
    result._specializedThemes = {};

    // we could put this in _extend_self, but we don't want to clone
    // it for each and every argument passed to create().
    result.classNames = SC.clone(this.classNames);

    var args = arguments, len = args.length, idx, mixin;
    for (idx = 0; idx < len; idx++) {
      result._extend_self(args[idx]);
    }

    if (result.name && !result.classNames.contains(result.name)) result.classNames.push(result.name);

    return result;
  },

  /**
    Creates a child theme based on this theme, with the given name,
    and automatically registers it as a child theme.
  */
  subtheme: function(name) {
    // extend the theme
    var t = this.create({ name: name });

    // add to our set of themes
    this.addTheme(t);

    // and return the theme class
    return t;
  },

  /**
    Semi-private, only used by SC.View to create "invisible" subthemes. You
    should never need to call this directly, nor even worry about.

    Invisible subthemes are only available when find is called _on this theme_;
    if find() is called on a child theme, it will _not_ locate this theme.

    The reason for "invisible" subthemes is that SC.View will create a subtheme
    when it finds a theme name that doesn't exist. For example, imagine that you
    have a parent view with theme "base", and a child view with theme "popup".
    If no "popup" theme can be found inside "base", SC.View will call
    base.subtheme. This will create a new theme with the name "popup",
    derived from "base". Everyone is happy.

    But what happens if you then change the parent theme to "ace"? The view
    will try again to find "popup", and it will find it-- but it will still be
    a child theme of "base"; SC.View _needs_ to re-subtheme it, but it won't
    know it needs to, because it has been found.
  */
  invisibleSubtheme: function(name) {
    // extend the theme
    var t = this.create({ name: name });

    // add to our set of themes
    this._privateThemes[name] = t;

    // and return the theme class
    return t;
  },

  //
  // THEME MANAGEMENT
  //

  themes: {},

  /**
    Finds a theme by name within this theme (the theme must have
    previously been added to this theme or a base theme by using addTheme, or
    been registered as a root theme).

    If the theme found is not a root theme, this will specialize the theme so
    that it includes all class names for this theme.
  */
  find: function(themeName) {
    if (this === SC.Theme) return this.themes[themeName];
    var theme;

    // if there is a private theme (invisible subtheme) by that name, use it
    theme = this._privateThemes[themeName];
    if (theme) return theme;

    // if there is a specialized version (the theme extended with our class names)
    // return that one
    theme = this._specializedThemes[themeName];
    if (theme) return theme;

    // otherwise, we may need to specialize one.
    theme = this.themes[themeName];
    if (theme && !this._specializedThemes[themeName]) {
      return (this._specializedThemes[themeName] = theme.create({ classNames: this.classNames }));
    }

    // and finally, if it is a root theme, we do nothing to it.
    theme = SC.Theme.themes[themeName];
    if (theme) return theme;

    return null;
  },

  /**
    Adds a child theme to the theme. This allows the theme to be located
    by SproutCore views and such later.

    Each theme is registered in the "themes" property by name. Calling
    find(name) will return the theme with the given name.

    Because the themes property is an object begetted from (based on) any
    parent theme's "themes" property, if the theme cannot be found in this
    theme, it will be found in any parent themes.
  */
  addTheme: function(theme) {
    this.themes[theme.name] = theme;
  }
};

// SproutCore _always_ has its base theme. This is not quite
// optimal, but the reasoning is because of test running: the
// test runner, when running foundation unit tests, cannot load
// the theme. As such, foundation must include default versions of
// all of its render delegates, and it does so in BaseTheme. All SproutCore
// controls have render delegates in BaseTheme.
SC.BaseTheme = SC.Theme.create({
  name: '' // it is a base class, and doesn't need a class name or such
});

// however, SproutCore does need a default theme, even if no
// actual theme is loaded.
SC.Theme.themes['sc-base'] = SC.BaseTheme;
SC.defaultTheme = 'sc-base';
