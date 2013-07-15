/*globals TemplateTests:true App:true */

var set = Ember.set, get = Ember.get, trim = Ember.$.trim;
var firstGrandchild = function(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
};
var nthChild = function(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
};
var firstChild = nthChild;

var originalLookup = Ember.lookup, lookup, TemplateTests, view;

module("ember-handlebars/tests/views/collection_view_test", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    lookup.TemplateTests = TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });

    Ember.lookup = originalLookup;
  }
});

test("passing a block to the collection helper sets it as the template for example views", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.CollectionTestView}} <label></label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('label').length, 3, 'one label element is created for each content item');
});

test("collection helper should accept relative paths", function() {
  Ember.TESTING_DEPRECATION = true;

  try {
    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{#collection view.collection}} <label></label> {{/collection}}'),
      collection: Ember.CollectionView.extend({
        tagName: 'ul',
        content: Ember.A(['foo', 'bar', 'baz'])
      })
    });

    Ember.run(function() {
      view.appendTo('#qunit-fixture');
    });

    equal(view.$('label').length, 3, 'one label element is created for each content item');
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }
});

test("empty views should be removed when content is added to the collection (regression, ht: msofaer)", function() {
  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create();
  });

  App.EmptyView = Ember.View.extend({
    template : Ember.Handlebars.compile("<td>No Rows Yet</td>")
  });

  App.ListView = Ember.CollectionView.extend({
    emptyView: App.EmptyView
  });

  App.listController = Ember.ArrayProxy.create({
    content : Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection App.ListView contentBinding="App.listController" tagName="table"}} <td>{{view.content.title}}</td> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('tr').length, 1, 'Make sure the empty view is there (regression)');

  Ember.run(function() {
    App.listController.pushObject({title : "Go Away, Placeholder Row!"});
  });

  equal(view.$('tr').length, 1, 'has one row');
  equal(view.$('tr:nth-child(1) td').text(), 'Go Away, Placeholder Row!', 'The content is the updated data.');

  Ember.run(function() { App.destroy(); });
});

test("should be able to specify which class should be used for the empty view", function() {
  Ember.TESTING_DEPRECATION = true;

  try {
    var App;

    Ember.run(function() {
      lookup.App = App = Ember.Application.create();
    });

    App.EmptyView = Ember.View.extend({
      template: Ember.Handlebars.compile('This is an empty view')
    });

    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{collection emptyViewClass="App.EmptyView"}}')
    });

    Ember.run(function() {
      view.appendTo('#qunit-fixture');
    });

    equal(view.$().text(), 'This is an empty view', "Empty view should be rendered.");

    Ember.run(function() {
      App.destroy();
    });
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }
});

test("if no content is passed, and no 'else' is specified, nothing is rendered", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li').length, 0, 'if no "else" is specified, nothing is rendered');
});

test("if no content is passed, and 'else' is specified, the else block is rendered", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{ else }} <del></del> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li:has(del)').length, 1, 'the else block is rendered');
});

test("a block passed to a collection helper defaults to the content property of the context", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{view.content}}</label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li:nth-child(1) label').length, 1);
  equal(view.$('li:nth-child(1) label').text(), 'foo');
  equal(view.$('li:nth-child(2) label').length, 1);
  equal(view.$('li:nth-child(2) label').text(), 'bar');
  equal(view.$('li:nth-child(3) label').length, 1);
  equal(view.$('li:nth-child(3) label').text(), 'baz');
});

test("a block passed to a collection helper defaults to the view", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{view.content}}</label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  // Preconds
  equal(view.$('li:nth-child(1) label').length, 1);
  equal(view.$('li:nth-child(1) label').text(), 'foo');
  equal(view.$('li:nth-child(2) label').length, 1);
  equal(view.$('li:nth-child(2) label').text(), 'bar');
  equal(view.$('li:nth-child(3) label').length, 1);
  equal(view.$('li:nth-child(3) label').text(), 'baz');

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A());
  });
  equal(view.$('label').length, 0, "all list item views should be removed from DOM");
});

test("should include an id attribute if id is set in the options hash", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView" id="baz"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul#baz').length, 1, "adds an id attribute");
});

test("should give its item views the class specified by itemClass", function() {
  TemplateTests.itemClassTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.itemClassTestCollectionView" itemClass="baz"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.baz').length, 3, "adds class attribute");
});

test("should give its item views the classBinding specified by itemClassBinding", function() {
  TemplateTests.itemClassBindingTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A([Ember.Object.create({ isBaz: false }), Ember.Object.create({ isBaz: true }), Ember.Object.create({ isBaz: true })])
  });

  view = Ember.View.create({
    isBar: true,
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.itemClassBindingTestCollectionView" itemClassBinding="view.isBar"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.is-bar').length, 3, "adds class on initial rendering");

  // NOTE: in order to bind an item's class to a property of the item itself (e.g. `isBaz` above), it will be necessary
  // to introduce a new keyword that could be used from within `itemClassBinding`. For instance, `itemClassBinding="item.isBaz"`.
});

test("should give its item views the property specified by itemPropertyBinding", function() {
  Ember.TESTING_DEPRECATION = true;

  try {
    TemplateTests.itemPropertyBindingTestItemView = Ember.View.extend({
      tagName: 'li'
    });

    // Use preserveContext=false so the itemView handlebars context is the view context
    // Set itemView bindings using item*
    view = Ember.View.create({
      baz: "baz",
      content: Ember.A([Ember.Object.create(), Ember.Object.create(), Ember.Object.create()]),
      template: Ember.Handlebars.compile('{{#collection contentBinding="view.content" tagName="ul" itemViewClass="TemplateTests.itemPropertyBindingTestItemView" itemPropertyBinding="view.baz" preserveContext=false}}{{view.property}}{{/collection}}')
    });

    Ember.run(function() {
      view.appendTo('#qunit-fixture');
    });

    equal(view.$('ul li').length, 3, "adds 3 itemView");

    view.$('ul li').each(function(i, li) {
      equal(Ember.$(li).text(), "baz", "creates the li with the property = baz");
    });

    Ember.run(function() {
      set(view, 'baz', "yobaz");
    });

    equal(view.$('ul li:first').text(), "yobaz", "change property of sub view");
  } finally {
    Ember.TESTING_DEPRECATION = false;
  }
});

test("should work inside a bound {{#if}}", function() {
  var testData = Ember.A([Ember.Object.create({ isBaz: false }), Ember.Object.create({ isBaz: true }), Ember.Object.create({ isBaz: true })]);
  TemplateTests.ifTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: testData
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.shouldDisplay}}{{#collection "TemplateTests.ifTestCollectionView"}}{{content.isBaz}}{{/collection}}{{/if}}'),
    shouldDisplay: true
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li').length, 3, "renders collection when conditional is true");

  Ember.run(function() { set(view, 'shouldDisplay', false); });
  equal(view.$('ul li').length, 0, "removes collection when conditional changes to false");

  Ember.run(function() { set(view, 'shouldDisplay', true); });
  equal(view.$('ul li').length, 3, "collection renders when conditional changes to true");
});

test("should pass content as context when using {{#each}} helper", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.releases}}Mac OS X {{version}}: {{name}} {{/each}}'),

    releases: Ember.A([
                { version: '10.7',
                  name: 'Lion' },
                { version: '10.6',
                  name: 'Snow Leopard' },
                { version: '10.5',
                  name: 'Leopard' }
              ])
  });

  Ember.run(function() { view.appendTo('#qunit-fixture'); });

  equal(view.$().text(), "Mac OS X 10.7: Lion Mac OS X 10.6: Snow Leopard Mac OS X 10.5: Leopard ", "prints each item in sequence");
});

test("should re-render when the content object changes", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest}}{{view.content}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A(['bing', 'bat', 'bang']));
  });

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A(['ramalamadingdong']));
  });

  equal(view.$('li').length, 1, "rerenders with correct number of items");
  equal(trim(view.$('li:eq(0)').text()), "ramalamadingdong");

});

test("select tagName on collection helper automatically sets child tagName to option", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    content: Ember.A(['foo'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="select"}}{{view.content}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('qunit-fixture');
  });

  equal(view.$('option').length, 1, "renders the correct child tag name");

});

test("tagName works in the #collection helper", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    content: Ember.A(['foo', 'bar'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="ol"}}{{view.content}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ol').length, 1, "renders the correct tag name");
  equal(view.$('li').length, 2, "rerenders with correct number of items");

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A(['bing', 'bat', 'bang']));
  });

  equal(view.$('li').length, 3, "rerenders with correct number of items");
  equal(trim(view.$('li:eq(0)').text()), "bing");
});

test("should render nested collections", function() {

  TemplateTests.InnerList = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['one','two','three'])
  });

  TemplateTests.OuterList = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.OuterList class="outer"}}{{content}}{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul.outer > li').length, 1, "renders the outer list with correct number of items");
  equal(view.$('ul.inner').length, 1, "the inner list exsits");
  equal(view.$('ul.inner > li').length, 3, "renders the inner list with correct number of items");

});

test("should render multiple, bound nested collections (#68)", function() {
  var view;

  Ember.run(function() {
    TemplateTests.contentController = Ember.ArrayProxy.create({
      content: Ember.A(['foo','bar'])
    });

    TemplateTests.InnerList = Ember.CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'parentView.innerListContent'
    });

    TemplateTests.OuterListItem = Ember.View.extend({
      template: Ember.Handlebars.compile('{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{content}}'),
      innerListContent: Ember.computed(function() {
        return Ember.A([1,2,3]);
      })
    });

    TemplateTests.OuterList = Ember.CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'TemplateTests.contentController',
      itemViewClass: TemplateTests.OuterListItem
    });

    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{collection TemplateTests.OuterList class="outer"}}')
    });
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul.outer > li').length, 2, "renders the outer list with correct number of items");
  equal(view.$('ul.inner').length, 2, "renders the correct number of inner lists");
  equal(view.$('ul.inner:first > li').length, 3, "renders the first inner list with correct number of items");
  equal(view.$('ul.inner:last > li').length, 3, "renders the second list with correct number of items");

  Ember.run(function() {
    view.destroy();
  });
});

test("should allow view objects to be swapped out without throwing an error (#78)", function() {
  var view, dataset, secondDataset;

  Ember.run(function() {
    TemplateTests.datasetController = Ember.Object.create();

    TemplateTests.ReportingView = Ember.View.extend({
      datasetBinding: 'TemplateTests.datasetController.dataset',
      readyBinding: 'dataset.ready',
      itemsBinding: 'dataset.items',
      template: Ember.Handlebars.compile("{{#if view.ready}}{{collection TemplateTests.CollectionView}}{{else}}Loading{{/if}}")
    });

    TemplateTests.CollectionView = Ember.CollectionView.extend({
      contentBinding: 'parentView.items',
      tagName: 'ul',
      template: Ember.Handlebars.compile("{{view.content}}")
    });

    view = TemplateTests.ReportingView.create();
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Loading", "renders the loading text when the dataset is not ready");

  Ember.run(function() {
    dataset = Ember.Object.create({
      ready: true,
      items: Ember.A([1,2,3])
    });
    TemplateTests.datasetController.set('dataset',dataset);
  });

  equal(view.$('ul > li').length, 3, "renders the collection with the correct number of items when the dataset is ready");

  Ember.run(function() {
    secondDataset = Ember.Object.create({ready: false});
    TemplateTests.datasetController.set('dataset',secondDataset);
  });

  equal(view.$().text(), "Loading", "renders the loading text when the second dataset is not ready");

  Ember.run(function() {
    view.destroy();
  });
});

test("context should be content", function() {
  var App, view;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create();
  });

  App.items = Ember.A([
    Ember.Object.create({name: 'Dave'}),
    Ember.Object.create({name: 'Mary'}),
    Ember.Object.create({name: 'Sara'})
  ]);

  App.AnItemView = Ember.View.extend({
    template: Ember.Handlebars.compile("Greetings {{name}}")
  });

  App.AView = Ember.View.extend({
    template: Ember.Handlebars.compile('{{collection contentBinding="App.items" itemViewClass="App.AnItemView"}}')
  });

  Ember.run(function() {
    view = App.AView.create();
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Greetings DaveGreetings MaryGreetings Sara");

  Ember.run(function() {
    view.destroy();
    App.destroy();
  });
});
