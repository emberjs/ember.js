// TODO: Don't require the entire module
require("sproutcore-handlebars");

SC.Handlebars.ViewHelper = SC.Object.create({
  viewClassFromHTMLOptions: function(viewClass, options) {
    var extensions = SC.clone(options),
        classes = extensions['class'];

    if (extensions.id) {
      extensions.elementId = extensions.id;
    }

    if (classes) {
      classes = classes.split(' ');
      extensions.classNames = classes;
    }

    if (extensions.classBinding) {
      extensions.classNameBindings = extensions.classBinding.split(' ');
    }

    delete extensions.id;
    delete extensions['class'];
    delete extensions.classBinding;

    return viewClass.extend(extensions);
  },

  helper: function(thisContext, path, options) {
    var inverse = options.inverse;
    var data = options.data;
    var view = data.view;
    var fn = options.fn;
    var hash = options.hash;

    var newView;
    if (path.isClass) {
      newView = path;
      if (!newView) {
        throw "Null or undefined object was passed to the #view helper. Did you mean to pass a property path string?";
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
      if (!newView) { throw "Unable to find view at path '" + path + "'"; }
    }

    newView = this.viewClassFromHTMLOptions(newView, hash);
    var currentView = data.view;

    var childViews = currentView.get('childViews');
    var childView = currentView.createChildView(newView);

    // Set the template of the view to the passed block if we got one
    if (fn) { childView.template = fn; }

    childViews.pushObject(childView);

    var buffer = SC.RenderBuffer(childView.get('tagName'));
    childView.renderToBuffer(buffer);

    return new Handlebars.SafeString(buffer.string());
  }
});


Handlebars.registerHelper('view', function(path, options) {
  return SC.Handlebars.ViewHelper.helper(this, path, options);
});

