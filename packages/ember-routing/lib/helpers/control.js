var get = Ember.get, set = Ember.set;

Ember.Handlebars.registerHelper('control', function(path, modelPath, options) {
  if (arguments.length === 2) {
    options = modelPath;
    modelPath = undefined;
  }

  var model;

  if (modelPath) {
    model = Ember.Handlebars.get(this, modelPath, options);
  }

  var controller = options.data.keywords.controller,
      view = options.data.keywords.view,
      children = get(controller, '_childContainers'),
      controlID = options.hash.controlID,
      container, subContainer;

  if (children.hasOwnProperty(controlID)) {
    subContainer = children[controlID];
  } else {
    container = get(controller, 'container'),
    subContainer = container.child();
    children[controlID] = subContainer;
  }

  var normalizedPath = path.replace(/\//g, '.');

  var childView = subContainer.lookup('view:' + normalizedPath),
      childController = subContainer.lookup('controller:' + normalizedPath),
      childTemplate = subContainer.lookup('template:' + path);

  Ember.assert("Could not find controller for path: " + normalizedPath, childController);
  Ember.assert("Could not find view for path: " + normalizedPath, childView);
  Ember.assert("Could not find template for path: " + path, childTemplate);

  set(childController, 'target', controller);
  set(childController, 'model', model);

  options.hash.template = childTemplate;
  options.hash.controller = childController;

  function observer() {
    var model = Ember.Handlebars.get(this, modelPath, options);
    set(childController, 'model', model);
    childView.rerender();
  }

  Ember.addObserver(this, modelPath, observer);
  childView.one('willDestroyElement', function() {
    Ember.removeObserver(this, modelPath, observer);
  });

  Ember.Handlebars.helpers.view.call(this, childView, options);
});
