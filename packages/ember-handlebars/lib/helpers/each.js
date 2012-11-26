require("ember-handlebars/ext");
require("ember-views/views/collection_view");
require("ember-handlebars/views/metamorph_view");

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, set = Ember.set;

Ember.Handlebars.EachView = Ember.CollectionView.extend(Ember._Metamorph, {
  itemViewClass: Ember._MetamorphView,
  emptyViewClass: Ember._MetamorphView,

  createChildView: function(view, attrs) {
    view = this._super(view, attrs);

    // At the moment, if a container view subclass wants
    // to insert keywords, it is responsible for cloning
    // the keywords hash. This will be fixed momentarily.
    var keyword = get(this, 'keyword');

    if (keyword) {
      var data = get(view, 'templateData');

      data = Ember.copy(data);
      data.keywords = view.cloneKeywords();
      set(view, 'templateData', data);

      var content = get(view, 'content');

      // In this case, we do not bind, because the `content` of
      // a #each item cannot change.
      data.keywords[keyword] = content;
    }

    return view;
  }
});

var GroupedEach = Ember.Handlebars.GroupedEach = function(context, path, options) {
  var self = this,
      normalized = Ember.Handlebars.normalizePath(context, path, options.data);

  this.context = context;
  this.path = path;
  this.options = options;
  this.template = options.fn;
  this.containingView = options.data.view;
  this.normalizedRoot = normalized.root;
  this.normalizedPath = normalized.path;
  this.content = this.lookupContent();

  this.addContentObservers();
  this.addArrayObservers();

  this.containingView.on('willClearRender', function() {
    self.destroy();
  });
};

GroupedEach.prototype = {
  contentWillChange: function() {
    this.removeArrayObservers();
  },

  contentDidChange: function() {
    this.content = this.lookupContent();
    this.addArrayObservers();
    this.rerenderContainingView();
  },

  contentArrayWillChange: Ember.K,

  contentArrayDidChange: function() {
    this.rerenderContainingView();
  },

  lookupContent: function() {
    return Ember.Handlebars.get(this.normalizedRoot, this.normalizedPath, this.options);
  },

  addArrayObservers: function() {
    this.content.addArrayObserver(this, {
      willChange: 'contentArrayWillChange',
      didChange: 'contentArrayDidChange'
    });
  },

  removeArrayObservers: function() {
    this.content.removeArrayObserver(this, {
      willChange: 'contentArrayWillChange',
      didChange: 'contentArrayDidChange'
    });
  },

  addContentObservers: function() {
    Ember.addBeforeObserver(this.normalizedRoot, this.normalizedPath, this, this.contentWillChange);
    Ember.addObserver(this.normalizedRoot, this.normalizedPath, this, this.contentDidChange);
  },

  removeContentObservers: function() {
    Ember.removeBeforeObserver(this.normalizedRoot, this.normalizedPath, this.contentWillChange);
    Ember.removeObserver(this.normalizedRoot, this.normalizedPath, this.contentDidChange);
  },

  render: function() {
    var content = this.content,
        contentLength = get(content, 'length'),
        data = this.options.data,
        template = this.template;

    data.insideEach = true;
    for (var i = 0; i < contentLength; i++) {
      template(content.objectAt(i), { data: data });
    }
  },

  rerenderContainingView: function() {
    Ember.run.scheduleOnce('render', this.containingView, 'rerender');
  },

  destroy: function() {
    this.removeContentObservers();
    this.removeArrayObservers();
  }
};

/**
  The `{{#each}}` helper loops over elements in a collection, rendering its block once for each item:

  ``` javascript
  Developers = [{name: 'Yehuda'},{name: 'Tom'}, {name: 'Paul'}];
  ```

  ``` handlebars
  {{#each Developers}}
    {{name}}
  {{/each}}
  ```

  `{{each}}` supports an alternative syntax with element naming:

  ``` handlebars
  {{#each person in Developers}}
    {{person.name}}
  {{/each}}
  ```

  When looping over objects that do not have properties, `{{this}}` can be used to render the object:

  ``` javascript
  DeveloperNames = ['Yehuda', 'Tom', 'Paul']
  ```

  ``` handlebars
  {{#each DeveloperNames}}
    {{this}}
  {{/each}}
  ```

  ### Blockless Use

  If you provide an `itemViewClass` option that has its own `template` you can omit
  the block in a similar way to how it can be done with the collection helper.

  The following template:

  ``` handlebars
  <script type="text/x-handlebars">
    {{#view App.MyView }}
      {{each view.items itemViewClass="App.AnItemView"}}
    {{/view}}
  </script>
  ```

  And application code

  ``` javascript
  App = Ember.Application.create({
    MyView: Ember.View.extend({
      items: [
        Ember.Object.create({name: 'Dave'}),
        Ember.Object.create({name: 'Mary'}),
        Ember.Object.create({name: 'Sara'})
      ]
    })
  });

  App.AnItemView = Ember.View.extend({
    template: Ember.Handlebars.compile("Greetings {{name}}")
  });

  App.initialize();
  ```

  Will result in the HTML structure below

  ``` html
  <div class="ember-view">
    <div class="ember-view">Greetings Dave</div>
    <div class="ember-view">Greetings Mary</div>
    <div class="ember-view">Greetings Sara</div>
  </div>
  ```


  @method each
  @for Ember.Handlebars.helpers
  @param [name] {String} name for item (used with `in`)
  @param path {String} path
*/
Ember.Handlebars.registerHelper('each', function(path, options) {
  if (arguments.length === 4) {
    Ember.assert("If you pass more than one argument to the each helper, it must be in the form #each foo in bar", arguments[1] === "in");

    var keywordName = arguments[0];

    options = arguments[3];
    path = arguments[2];
    if (path === '') { path = "this"; }

    options.hash.keyword = keywordName;
  } else {
    options.hash.eachHelper = 'each';
  }

  options.hash.contentBinding = path;
  // Set up emptyView as a metamorph with no tag
  //options.hash.emptyViewClass = Ember._MetamorphView;

  if (options.data.insideGroup && !options.hash.groupedRows && !options.hash.itemViewClass) {
    new Ember.Handlebars.GroupedEach(this, path, options).render();
  } else {
    return Ember.Handlebars.helpers.collection.call(this, 'Ember.Handlebars.EachView', options);
  }
});
