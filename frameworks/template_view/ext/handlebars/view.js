sc_require('ext/handlebars');

SC.Handlebars.ViewHelper = SC.Object.create({
  helper: function(thisContext, path, options) {
    var inverse = options.inverse;
    var data = options.data;
    var view = data.view;
    var fn = options.fn;
    var hash = options.hash;

    var newView;
    if (path.isClass || path.isObject) {
      newView = path;
      if (!newView) {
        throw new Error("Null or undefined object was passed to the #view helper. Did you mean to pass a property path string?");
      }
    } else {
      // Path is relative, look it up with this view as the root
      if (path.charAt(0) === '.') {
        newView = SC.objectForPropertyPath(path.slice(1), view);
      } else {
        // Path is absolute, look up path on global (window) object
        newView = SC.getPath(thisContext, path);
        if (!newView) {
          newView = SC.getPath(path);
        }
      }
      if (!newView) { throw new Error("Unable to find view at path '" + path + "'"); }
    }

    if (hash.id) { hash.layerId = hash.id; }
    else if (path.id) { hash.id = hash.layerId = path.id; }

    var contextOptions = {
      'id': hash.id,
      'class': hash['class'],
      'classBinding': hash.classBinding
    };
    delete hash.id;
    delete hash['class'];
    delete hash.classBinding;

    if (newView.isClass) {
      newView = newView.extend(hash);
    } else {
      SC.mixin(newView, hash);
    }

    var currentView = data.view;

    var childViews = currentView.get('childViews');
    var childView = currentView.createChildView(newView);

    // Set the template of the view to the passed block if we got one
    if (fn) { childView.template = fn; }

    childViews.pushObject(childView);

    var context = SC.RenderContext(childView.get('tagName'));

    // Add id and class names passed to view helper
    this.applyAttributes(contextOptions, childView, context);

    // tomdale wants to make SproutCore slow
    childView.renderToContext(context);

    return new Handlebars.SafeString(context.join());
  },

  applyAttributes: function(options, childView, context) {
    var id = options.id;
    var classNames = options['class'];

    if (classNames) {
      context.addClass(classNames.split(' '));
    }

    if (id) {
      childView.set('layerId', id);
      context.id(id);
    }

    var classBindings = options.classBinding;
    if (classBindings) {
      SC.Handlebars.bindClasses(childView, classBindings, childView).forEach(function(className) {
        context.setClass(className, YES);
      });
    }
  }
});


Handlebars.registerHelper('view', function(path, options) {
  return SC.Handlebars.ViewHelper.helper(this, path, options);
});
