// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TemplateTests */

var set = Ember.set, get = Ember.get, setPath = Ember.setPath;
var firstGrandchild = function(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
};
var nthChild = function(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
};
var firstChild = nthChild;

var view;

module("ember-handlebars/tests/views/collection_view_test", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    if (view) {
      view.destroy();
    }

    window.TemplateTests = undefined;
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

  equals(view.$('label').length, 3, 'one label element is created for each content item');
});

test("collection helper should accept relative paths", function() {

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection collection}} <label></label> {{/collection}}'),
    collection: Ember.CollectionView.extend({
      tagName: 'ul',
      content: Ember.A(['foo', 'bar', 'baz'])
    })
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('label').length, 3, 'one label element is created for each content item');
});

test("empty views should be removed when content is added to the collection (regression, ht: msofaer)", function() {
  window.App = Ember.Application.create();

  App.EmptyView = Ember.View.extend({
    template : Ember.Handlebars.compile("<td>No Rows Yet</td>")
  });

  App.ListView = Ember.CollectionView.extend({
    emptyView: App.EmptyView
  });

  App.ListController = Ember.ArrayProxy.create({
    content : Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection App.ListView contentBinding="App.ListController" tagName="table"}} <td>{{content.title}}</td> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    App.ListController.pushObject({title : "Go Away, Placeholder Row!"});
  });

  equals(view.$('tr').length, 1, 'has one row');

  window.App.destroy();
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

  equals(view.$('li').length, 0, 'if no "else" is specified, nothing is rendered');
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

  equals(view.$('li:has(del)').length, 1, 'the else block is rendered');
});

test("a block passed to a collection helper defaults to the content property of the context", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{content}}</label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('li:has(label:contains("foo")) + li:has(label:contains("bar")) + li:has(label:contains("baz"))').length, 1, 'one label element is created for each content item');
});

test("a block passed to a collection helper defaults to the view", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{content}}</label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
  equals(view.$('li:has(label:contains("foo")) + li:has(label:contains("bar")) + li:has(label:contains("baz"))').length, 1, 'precond - one aside element is created for each content item');

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A());
  });
  equals(view.$('label').length, 0, "all list item views should be removed from DOM");
});

test("should include an id attribute if id is set in the options hash", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView" id="baz"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul#baz').length, 1, "adds an id attribute");
});

test("should give its item views the class specified by itemClass", function() {
  TemplateTests.itemClassTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });
  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.itemClassTestCollectionView" itemClass="baz"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul li.baz').length, 3, "adds class attribute");
});

test("should give its item views the classBinding specified by itemClassBinding", function() {
  TemplateTests.itemClassBindingTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A([Ember.Object.create({ isBaz: false }), Ember.Object.create({ isBaz: true }), Ember.Object.create({ isBaz: true })])
  });

  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.itemClassBindingTestCollectionView" itemClassBinding="content.isBaz"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul li.is-baz').length, 2, "adds class on initial rendering");

  Ember.run(function() {
    setPath(firstChild(view), 'content.0.isBaz', true);
  });

  equals(view.$('ul li.is-baz').length, 3, "adds class when property changes");

  Ember.run(function() {
    setPath(firstChild(view), 'content.0.isBaz', false);
  });

  equals(view.$('ul li.is-baz').length, 2, "removes class when property changes");
});

test("should work inside a bound {{#if}}", function() {
  var testData = Ember.A([Ember.Object.create({ isBaz: false }), Ember.Object.create({ isBaz: true }), Ember.Object.create({ isBaz: true })]);
  TemplateTests.ifTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: testData
  });

  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if shouldDisplay}}{{#collection "TemplateTests.ifTestCollectionView"}}{{content.isBaz}}{{/collection}}{{/if}}'),
    shouldDisplay: true
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul li').length, 3, "renders collection when conditional is true");

  Ember.run(function() { set(view, 'shouldDisplay', NO); });
  equals(view.$('ul li').length, 0, "removes collection when conditional changes to false");

  Ember.run(function() { set(view, 'shouldDisplay', YES); });
  equals(view.$('ul li').length, 3, "collection renders when conditional changes to true");
});

test("should pass content as context when using {{#each}} helper", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each releases}}Mac OS X {{version}}: {{name}} {{/each}}'),

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

  equals(view.$().text(), "Mac OS X 10.7: Lion Mac OS X 10.6: Snow Leopard Mac OS X 10.5: Leopard ", "prints each item in sequence");
});

test("should re-render when the content object changes", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A()
  });

  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest}}{{content}}{{/collection}}')
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

  equals(view.$('li').length, 1, "rerenders with correct number of items");
  equals(view.$('li:eq(0)').text(), "ramalamadingdong");

});

test("select tagName on collection helper automatically sets child tagName to option", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    content: Ember.A(['foo'])
  });
  
  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="select"}}{{content}}{{/collection}}')
  });
  
  Ember.run(function() {
    view.appendTo('qunit-fixture');
  });
  
  equals(view.$('option').length, 1, "renders the correct child tag name");
  
});

test("tagName works in the #collection helper", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    content: Ember.A(['foo', 'bar'])
  });

  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="ol"}}{{content}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ol').length, 1, "renders the correct tag name");
  equals(view.$('li').length, 2, "rerenders with correct number of items");

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A(['bing', 'bat', 'bang']));
  });

  equals(view.$('li').length, 3, "rerenders with correct number of items");
  equals(view.$('li:eq(0)').text(), "bing");
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

  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.OuterList class="outer"}}{{content}}{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul.outer > li').length, 1, "renders the outer list with correct number of items");
  equals(view.$('ul.inner').length, 1, "the inner list exsits");
  equals(view.$('ul.inner > li').length, 3, "renders the inner list with correct number of items");

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
      }).cacheable()
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

  equals(view.$('ul.outer > li').length, 2, "renders the outer list with correct number of items");
  equals(view.$('ul.inner').length, 2, "renders the correct number of inner lists");
  equals(view.$('ul.inner:first > li').length, 3, "renders the first inner list with correct number of items");
  equals(view.$('ul.inner:last > li').length, 3, "renders the second list with correct number of items");

});

test("should allow view objects to be swapped out without throwing an error (#78)", function() {
  var view, dataset, secondDataset;

  Ember.run(function() {
    TemplateTests.datasetController = Ember.Object.create();

    TemplateTests.ReportingView = Ember.View.extend({
      datasetBinding: 'TemplateTests.datasetController*dataset',
      readyBinding: 'dataset.ready',
      itemsBinding: 'dataset.items',
      template: Ember.Handlebars.compile("{{#if ready}}{{collection TemplateTests.CollectionView}}{{else}}Loading{{/if}}")
    });

    TemplateTests.CollectionView = Ember.CollectionView.extend({
      contentBinding: 'parentView.items',
      tagName: 'ul',
      template: Ember.Handlebars.compile("{{content}}")
    });

    view = TemplateTests.ReportingView.create();
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$().text(), "Loading", "renders the loading text when the dataset is not ready");

  Ember.run(function() {
    dataset = Ember.Object.create({
      ready: true,
      items: Ember.A([1,2,3])
    });
    TemplateTests.datasetController.set('dataset',dataset);
  });

  equals(view.$('ul > li').length, 3, "renders the collection with the correct number of items when the dataset is ready");

  Ember.run(function() {
    secondDataset = Ember.Object.create({ready: false});
    TemplateTests.datasetController.set('dataset',secondDataset);
  });

  equals(view.$().text(), "Loading", "renders the loading text when the second dataset is not ready");

});

