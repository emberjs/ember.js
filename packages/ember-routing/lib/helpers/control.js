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
      name = options.hash.name,
      container, subContainer;

  if (name && children.hasOwnProperty(name)) {
    subContainer = children[name];
  } else {
    container = get(controller, 'container'),
    subContainer = container.child();
    children[name] = subContainer;
  }

  var childView = subContainer.lookup('view:' + path),
      childController = subContainer.lookup('controller:' + path),
      childTemplate = subContainer.lookup('template:' + path);

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
