sc_require("views/view");

SC.View.reopen(
  /** @scope SC.View.prototype */ {

  init: function(original) {
    original();
    this._lastTheme = this.get('theme');
  }.enhance(),

  // ..........................................................
  // THEME SUPPORT
  //

  /**
    Names which theme this view should use; the theme named by this property
    will be set to the view's 'theme' property.

    Themes are identified by their name. In addition to looking for the
    theme globally, SproutCore will look for the theme inside 'baseTheme',
    which is almost always the parent view's theme.

    If null (the default), the view will set its 'theme' property to
    be equal to 'baseTheme'.

    Example: themeName: 'ace'

    @type String
  */
  themeName: null,

  /**
    Selects which theme to use as a 'base theme'. If null, the 'baseTheme'
    property will be set to the parent's theme. If there is no parent, the theme
    named by SC.defaultTheme is used.

    This property is private for the time being.

    @private
    @type String
  */
  baseThemeName: null,

  /**
    The SC.Theme instance which this view should use to render.

    Note: the actual code for this function is in _themeProperty for backwards-compatibility:
    some older views specify a string value for 'theme', which would override this property,
    breaking it.

    @property {SC.Theme}
  */
  theme: function() {
    var base = this.get('baseTheme'), themeName = this.get('themeName');

    // find theme, if possible
    if (themeName) {
      // Note: theme instance "find" function will search every parent
      // _except_ global (which is not a parent)
      var theme;
      if (base) {
        theme = base.find(themeName);
        if (theme) { return theme; }
      }

      theme = SC.Theme.find(themeName);
      if (theme) { return theme; }

      // Create a new invisible subtheme. This will cause the themeName to
      // be applied as a class name.
      return base.invisibleSubtheme(themeName);
    }

    // can't find anything, return base.
    return base;
  }.property('baseTheme', 'themeName').cacheable(),

  /**
    Detects when the theme changes. Replaces the layer if necessary.

    Also, because
  */
  _sc_view_themeDidChange: function() {
    if (this._lastTheme === this.get('theme')) { return; }
    this._lastTheme = this.get('theme');

    // invalidate child view base themes, if present
    var childViews = this.childViews, len = childViews.length, idx;
    for (idx = 0; idx < len; idx++) {
      childViews[idx].notifyPropertyChange('baseTheme');
    }

    if (this.get('layer')) { this.replaceLayer(); }
  }.observes('theme'),

  /**
    The SC.Theme instance in which the 'theme' property should look for the theme
    named by 'themeName'.

    For example, if 'baseTheme' is SC.AceTheme, and 'themeName' is 'popover',
    it will look to see if SC.AceTheme has a child theme named 'popover',
    and _then_, if it is not found, look globally.

    @private
    @property {SC.Theme}
  */
  baseTheme: function() {
    var parent;
    var baseThemeName = this.get('baseThemeName');
    if (baseThemeName) {
      return SC.Theme.find(baseThemeName);
    } else {
      parent = this.get('parentView');
      var theme  = parent && parent.get('theme');
      return   theme || SC.Theme.find(SC.defaultTheme);
    }
  }.property('baseThemeName', 'parentView').cacheable(),

  /**
    The object to which rendering and updating the HTML representation of this
    view should be delegated.

    By default, views are responsible for creating their own HTML
    representation. In some cases, however, you may want to create an object
    that is responsible for rendering all views of a certain type. For example,
    you may want rendering of SC.ButtonView to be controlled by an object that
    is specific to the current theme.

    By setting a render delegate, the render and update methods will be called
    on that object instead of the view itself.

    For your convenience, the view will provide its displayProperties to the
    RenderDelegate. In some cases, you may have a conflict between the RenderDelegate's
    API and your view's. For instance, you may have a 'value' property that is
    any number, but the render delegate expects a percentage. Make a 'displayValue'
    property, add _it_ to displayProperties instead of 'value', and the Render Delegate
    will automatically use that when it wants to find 'value.'

    You can also set the render delegate by using the 'renderDelegateName' property.

    @type Object
  */
  renderDelegate: function(key, value) {
    if (value) { this._setRenderDelegate = value; }
    if (this._setRenderDelegate) { return this._setRenderDelegate; }

    // If this view does not have a render delegate but has
    // renderDelegateName set, try to retrieve the render delegate from the
    // theme.
    var renderDelegateName = this.get('renderDelegateName'), renderDelegate;

    if (renderDelegateName) {
      renderDelegate = this.get('theme')[renderDelegateName];
      if (!renderDelegate) {
        throw new Error("%@: Unable to locate render delegate \"%@\" in theme.".fmt(this, renderDelegateName));
      }

      return renderDelegate;
    }

    return null;
  }.property('renderDelegateName', 'theme'),

  /**
    The name of the property of the current theme that contains the render
    delegate to use for this view.

    By default, views are responsible for creating their own HTML
    representation. You can tell the view to instead delegate rendering to the
    theme by setting this property to the name of the corresponding property
    of the theme.

    For example, to tell the view that it should render using the
    SC.ButtonView render delegate, set this property to
    'buttonRenderDelegate'. When the view is created, it will retrieve the
    buttonRenderDelegate property from its theme and set the renderDelegate
    property to that object.
  */
  renderDelegateName: null,

  /**
    [RO] Pass this object as the data source for render delegates. This proxy object
    for the view relays requests for properties like 'title' to 'displayTitle'
    as necessary.

    If you ever communicate with your view's render delegate, you should pass this
    object as the data source.

    The proxy that forwards RenderDelegate requests for properties to the view,
    handling display*, keeps track of the delegate's state, etc.
  */
  renderDelegateProxy: function() {
    return SC.View._RenderDelegateProxy.createForView(this);
  }.property('renderDelegate').cacheable(),

  /**
    Invoked whenever your view needs to create its HTML representation.

    You will normally override this method in your subclassed views to
    provide whatever drawing functionality you will need in order to
    render your content.

    This method is usually only called once per view. After that, the update
    method will be called to allow you to update the existing HTML
    representation.


    The default implementation of this method calls renderChildViews().

    For backwards compatibility, this method will also call the appropriate
    method on a render delegate object, if your view has one.

    @param {SC.RenderContext} context the render context
    @returns {void}
  */
  render: function(context, firstTime) {
    var renderDelegate = this.get('renderDelegate');

    if (renderDelegate) {
      if (firstTime) {
        renderDelegate.render(this.get('renderDelegateProxy'), context);
      } else {
        renderDelegate.update(this.get('renderDelegateProxy'), context.$());
      }
    }
  },

  applyAttributesToContext: function(original, context) {
    var theme = this.get('theme');
    var themeClassNames = theme.classNames, idx, len = themeClassNames.length;

    for (idx = 0; idx < len; idx++) {
      context.addClass(themeClassNames[idx]);
    }

    original(context);

    var renderDelegate = this.get('renderDelegate');
    if (renderDelegate && renderDelegate.className) {
      context.addClass(renderDelegate.className);
    }

    // @if(debug)
    if (renderDelegate && renderDelegate.name) {
      SC.Logger.error("Render delegates now use 'className' instead of 'name'.");
      SC.Logger.error("Name '%@' will be ignored.", renderDelegate.name);
    }
    // @endif
  }.enhance(),


  /**
    Invokes a method on the render delegate, if one is present and it implements
    that method.

    @param {String} method The name of the method to call.
    @param arg One or more arguments.
  */
  invokeRenderDelegateMethod: function(method, args) {
    var renderDelegate = this.get('renderDelegate');
    if (!renderDelegate) return undefined;

    if (SC.typeOf(renderDelegate[method]) !== SC.T_FUNCTION) return undefined;

    args = SC.$A(arguments);
    args.shift();
    args.unshift(this.get('renderDelegateProxy'));
    return renderDelegate[method].apply(renderDelegate, args);
  }
});

/**
  @class
  @private
  View Render Delegate Proxies are tool SC.Views use to:

  - look up 'display*' ('displayTitle' instead of 'title') to help deal with
    differences between the render delegate's API and the view's.

  RenderDelegateProxies are fully valid data sources for render delegates. They
  act as proxies to the view, interpreting the .get and .didChangeFor commands
  based on the view's displayProperties.

  This tool is not useful outside of SC.View itself, and as such, is private.
*/
SC.View._RenderDelegateProxy = {

  //@if(debug)
  // for testing:
  isViewRenderDelegateProxy: YES,
  //@endif

  /**
    Creates a View Render Delegate Proxy for the specified view.

    Implementation note: this creates a hash of the view's displayProperties
    array so that the proxy may quickly determine whether a property is a
    displayProperty or not. This could cause issues if the view's displayProperties
    array is modified after instantiation.

    @param {SC.View} view The view this proxy should proxy to.
    @returns SC.View._RenderDelegateProxy
  */
  createForView: function(view) {
    var ret = SC.beget(this);

    // set up displayProperty lookup for performance
    var dp = view.get('displayProperties'), lookup = {};
    for (var idx = 0, len = dp.length; idx < len; idx++) {
      lookup[dp[idx]] = YES;
    }

    // also allow the few special properties through
    lookup.theme = YES;

    ret._displayPropertiesLookup = lookup;
    ret.renderState = {};

    ret._view = view;
    return ret;
  },


  /**
    Provides the render delegate with any property it needs.

    This first looks up whether the property exists in the view's
    displayProperties, and whether it exists prefixed with 'display';
    for instance, if the render delegate asks for 'title', this will
    look for 'displayTitle' in the view's displayProperties array.

   @param {String} property The name of the property the render delegate needs.
   @returns The value.
  */
  get: function(property) {
    if (this[property] !== undefined) { return this[property]; }

    var displayProperty = 'display' + property.capitalize();

    if (this._displayPropertiesLookup[displayProperty]) {
      return this._view.get(displayProperty);
    } else {
      return this._view.get(property);
    }
  },

  /**
   Checks if any of the specified properties have changed.

   For each property passed, this first determines whether to use the
   'display' prefix. Then, it calls view.didChangeFor with context and that
   property name.
  */
  didChangeFor: function(context) {
    var len = arguments.length, idx;
    for (idx = 1; idx < len; idx++) {
      var property = arguments[idx],
          displayProperty = 'display' + property.capitalize();

      if (this._displayPropertiesLookup[displayProperty]) {
        if (this._view.didChangeFor(context, displayProperty)) { return YES; }
      } else {
        if (this._view.didChangeFor(context, property)) { return YES; }
      }
    }

    return NO;
  }
};

/**
  Generates a computed property that will look up the specified property from
  the view's render delegate, if present. You may specify a default value to
  return if there is no such property or is no render delegate.

  The generated property is read+write, so it may be overridden.

  @param {String} propertyName The name of the property to get from the render delegate..
  @param {Value} def The default value to use if the property is not present.
*/
SC.propertyFromRenderDelegate = function(propertyName, def) {
  return function(key, value) {
    // first, handle set() case
    if (value !== undefined) {
      this['_set_rd_' + key] = value;
    }

    // use any value set manually via set()  -- two lines ago.
    var ret = this['_set_rd_' + key];
    if (ret !== undefined) return ret;

    // finally, try to get it from the render delegate
    var renderDelegate = this.get('renderDelegate');
    if (renderDelegate && renderDelegate.get) {
      var proxy = this.get('renderDelegateProxy');
      ret = renderDelegate.getPropertyFor(proxy, propertyName);
    }

    if (ret !== undefined) return ret;

    return def;
  }.property('renderDelegate').cacheable();
};


