/*globals TemplateTests:true App:true */
/*jshint newcap:false*/

import {View as EmberView} from "ember-views/views/view";
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import EmberObject from "ember-runtime/system/object";
import {computed} from "ember-metal/computed";
import Namespace from "ember-runtime/system/namespace";
import ArrayProxy from "ember-runtime/system/array_proxy";
import CollectionView from "ember-views/views/collection_view";
import {A} from "ember-runtime/system/native_array";
import Container from "ember-runtime/system/container";
import EmberHandlebars from "ember-handlebars-compiler";

var trim = jQuery.trim;

import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";

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
    lookup.TemplateTests = TemplateTests = Namespace.create();
  },
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
    });

    Ember.lookup = originalLookup;
  }
});

test("passing a block to the collection helper sets it as the template for example views", function() {
  TemplateTests.CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection TemplateTests.CollectionTestView}} <label></label> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('label').length, 3, 'one label element is created for each content item');
});

test("collection helper should try to use container to resolve view", function() {
  var container = new Container();

  var ACollectionView = CollectionView.extend({
        tagName: 'ul',
        content: A(['foo', 'bar', 'baz'])
  });

  container.register('view:collectionTest', ACollectionView);

  var controller = {container: container};
  view = EmberView.create({
    controller: controller,
    template: EmberHandlebars.compile('{{#collection "collectionTest"}} <label></label> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('label').length, 3, 'one label element is created for each content item');
});

test("collection helper should accept relative paths", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection view.collection}} <label></label> {{/collection}}'),
    collection: CollectionView.extend({
      tagName: 'ul',
      content: A(['foo', 'bar', 'baz'])
    })
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('label').length, 3, 'one label element is created for each content item');
});

test("empty views should be removed when content is added to the collection (regression, ht: msofaer)", function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create();
  });

  App.EmptyView = EmberView.extend({
    template : EmberHandlebars.compile("<td>No Rows Yet</td>")
  });

  App.ListView = CollectionView.extend({
    emptyView: App.EmptyView
  });

  App.listController = ArrayProxy.create({
    content : A()
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection App.ListView contentBinding="App.listController" tagName="table"}} <td>{{view.content.title}}</td> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('tr').length, 1, 'Make sure the empty view is there (regression)');

  run(function() {
    App.listController.pushObject({title : "Go Away, Placeholder Row!"});
  });

  equal(view.$('tr').length, 1, 'has one row');
  equal(view.$('tr:nth-child(1) td').text(), 'Go Away, Placeholder Row!', 'The content is the updated data.');

  run(function() { App.destroy(); });
});

test("should be able to specify which class should be used for the empty view", function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create();
  });

  App.EmptyView = EmberView.extend({
    template: EmberHandlebars.compile('This is an empty view')
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{collection emptyViewClass="App.EmptyView"}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), 'This is an empty view', "Empty view should be rendered.");

  run(function() {
    App.destroy();
  });
});

test("if no content is passed, and no 'else' is specified, nothing is rendered", function() {
  TemplateTests.CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A()
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li').length, 0, 'if no "else" is specified, nothing is rendered');
});

test("if no content is passed, and 'else' is specified, the else block is rendered", function() {
  TemplateTests.CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A()
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{ else }} <del></del> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li:has(del)').length, 1, 'the else block is rendered');
});

test("a block passed to a collection helper defaults to the content property of the context", function() {
  TemplateTests.CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{view.content}}</label> {{/collection}}')
  });

  run(function() {
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
  TemplateTests.CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{view.content}}</label> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  // Preconds
  equal(view.$('li:nth-child(1) label').length, 1);
  equal(view.$('li:nth-child(1) label').text(), 'foo');
  equal(view.$('li:nth-child(2) label').length, 1);
  equal(view.$('li:nth-child(2) label').text(), 'bar');
  equal(view.$('li:nth-child(3) label').length, 1);
  equal(view.$('li:nth-child(3) label').text(), 'baz');

  run(function() {
    set(firstChild(view), 'content', A());
  });
  equal(view.$('label').length, 0, "all list item views should be removed from DOM");
});

test("should include an id attribute if id is set in the options hash", function() {
  TemplateTests.CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection "TemplateTests.CollectionTestView" id="baz"}}foo{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul#baz').length, 1, "adds an id attribute");
});

test("should give its item views the class specified by itemClass", function() {
  TemplateTests.itemClassTestCollectionView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection "TemplateTests.itemClassTestCollectionView" itemClass="baz"}}foo{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.baz').length, 3, "adds class attribute");
});

test("should give its item views the classBinding specified by itemClassBinding", function() {
  TemplateTests.itemClassBindingTestCollectionView = CollectionView.extend({
    tagName: 'ul',
    content: A([EmberObject.create({ isBaz: false }), EmberObject.create({ isBaz: true }), EmberObject.create({ isBaz: true })])
  });

  view = EmberView.create({
    isBar: true,
    template: EmberHandlebars.compile('{{#collection "TemplateTests.itemClassBindingTestCollectionView" itemClassBinding="view.isBar"}}foo{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.is-bar').length, 3, "adds class on initial rendering");

  // NOTE: in order to bind an item's class to a property of the item itself (e.g. `isBaz` above), it will be necessary
  // to introduce a new keyword that could be used from within `itemClassBinding`. For instance, `itemClassBinding="item.isBaz"`.
});

test("should give its item views the property specified by itemPropertyBinding", function() {
  TemplateTests.itemPropertyBindingTestItemView = EmberView.extend({
    tagName: 'li'
  });

  // Use preserveContext=false so the itemView handlebars context is the view context
  // Set itemView bindings using item*
  view = EmberView.create({
    baz: "baz",
    content: A([EmberObject.create(), EmberObject.create(), EmberObject.create()]),
    template: EmberHandlebars.compile('{{#collection contentBinding="view.content" tagName="ul" itemViewClass="TemplateTests.itemPropertyBindingTestItemView" itemPropertyBinding="view.baz" preserveContext=false}}{{view.property}}{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li').length, 3, "adds 3 itemView");

  view.$('ul li').each(function(i, li) {
    equal(jQuery(li).text(), "baz", "creates the li with the property = baz");
  });

  run(function() {
    set(view, 'baz', "yobaz");
  });

  equal(view.$('ul li:first').text(), "yobaz", "change property of sub view");
});

test("should work inside a bound {{#if}}", function() {
  var testData = A([EmberObject.create({ isBaz: false }), EmberObject.create({ isBaz: true }), EmberObject.create({ isBaz: true })]);
  TemplateTests.ifTestCollectionView = CollectionView.extend({
    tagName: 'ul',
    content: testData
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#if view.shouldDisplay}}{{#collection "TemplateTests.ifTestCollectionView"}}{{content.isBaz}}{{/collection}}{{/if}}'),
    shouldDisplay: true
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li').length, 3, "renders collection when conditional is true");

  run(function() { set(view, 'shouldDisplay', false); });
  equal(view.$('ul li').length, 0, "removes collection when conditional changes to false");

  run(function() { set(view, 'shouldDisplay', true); });
  equal(view.$('ul li').length, 3, "collection renders when conditional changes to true");
});

test("should pass content as context when using {{#each}} helper", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('{{#each view.releases}}Mac OS X {{version}}: {{name}} {{/each}}'),

    releases: A([
                { version: '10.7',
                  name: 'Lion' },
                { version: '10.6',
                  name: 'Snow Leopard' },
                { version: '10.5',
                  name: 'Leopard' }
              ])
  });

  run(function() { view.appendTo('#qunit-fixture'); });

  equal(view.$().text(), "Mac OS X 10.7: Lion Mac OS X 10.6: Snow Leopard Mac OS X 10.5: Leopard ", "prints each item in sequence");
});

test("should re-render when the content object changes", function() {
  TemplateTests.RerenderTest = CollectionView.extend({
    tagName: 'ul',
    content: A()
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection TemplateTests.RerenderTest}}{{view.content}}{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  run(function() {
    set(firstChild(view), 'content', A(['bing', 'bat', 'bang']));
  });

  run(function() {
    set(firstChild(view), 'content', A(['ramalamadingdong']));
  });

  equal(view.$('li').length, 1, "rerenders with correct number of items");
  equal(trim(view.$('li:eq(0)').text()), "ramalamadingdong");

});

test("select tagName on collection helper automatically sets child tagName to option", function() {
  TemplateTests.RerenderTest = CollectionView.extend({
    content: A(['foo'])
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection TemplateTests.RerenderTest tagName="select"}}{{view.content}}{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('option').length, 1, "renders the correct child tag name");

});

test("tagName works in the #collection helper", function() {
  TemplateTests.RerenderTest = CollectionView.extend({
    content: A(['foo', 'bar'])
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection TemplateTests.RerenderTest tagName="ol"}}{{view.content}}{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ol').length, 1, "renders the correct tag name");
  equal(view.$('li').length, 2, "rerenders with correct number of items");

  run(function() {
    set(firstChild(view), 'content', A(['bing', 'bat', 'bang']));
  });

  equal(view.$('li').length, 3, "rerenders with correct number of items");
  equal(trim(view.$('li:eq(0)').text()), "bing");
});

test("should render nested collections", function() {

  TemplateTests.InnerList = CollectionView.extend({
    tagName: 'ul',
    content: A(['one','two','three'])
  });

  TemplateTests.OuterList = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo'])
  });

  view = EmberView.create({
    template: EmberHandlebars.compile('{{#collection TemplateTests.OuterList class="outer"}}{{content}}{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul.outer > li').length, 1, "renders the outer list with correct number of items");
  equal(view.$('ul.inner').length, 1, "the inner list exsits");
  equal(view.$('ul.inner > li').length, 3, "renders the inner list with correct number of items");

});

test("should render multiple, bound nested collections (#68)", function() {
  var view;

  run(function() {
    TemplateTests.contentController = ArrayProxy.create({
      content: A(['foo','bar'])
    });

    TemplateTests.InnerList = CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'parentView.innerListContent'
    });

    TemplateTests.OuterListItem = EmberView.extend({
      template: EmberHandlebars.compile('{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{content}}'),
      innerListContent: computed(function() {
        return A([1,2,3]);
      })
    });

    TemplateTests.OuterList = CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'TemplateTests.contentController',
      itemViewClass: TemplateTests.OuterListItem
    });

    view = EmberView.create({
      template: EmberHandlebars.compile('{{collection TemplateTests.OuterList class="outer"}}')
    });
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul.outer > li').length, 2, "renders the outer list with correct number of items");
  equal(view.$('ul.inner').length, 2, "renders the correct number of inner lists");
  equal(view.$('ul.inner:first > li').length, 3, "renders the first inner list with correct number of items");
  equal(view.$('ul.inner:last > li').length, 3, "renders the second list with correct number of items");

  run(function() {
    view.destroy();
  });
});

test("should allow view objects to be swapped out without throwing an error (#78)", function() {
  var view, dataset, secondDataset;

  run(function() {
    TemplateTests.datasetController = EmberObject.create();

    TemplateTests.ReportingView = EmberView.extend({
      datasetBinding: 'TemplateTests.datasetController.dataset',
      readyBinding: 'dataset.ready',
      itemsBinding: 'dataset.items',
      template: EmberHandlebars.compile("{{#if view.ready}}{{collection TemplateTests.CollectionView}}{{else}}Loading{{/if}}")
    });

    TemplateTests.CollectionView = CollectionView.extend({
      contentBinding: 'parentView.items',
      tagName: 'ul',
      template: EmberHandlebars.compile("{{view.content}}")
    });

    view = TemplateTests.ReportingView.create();
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Loading", "renders the loading text when the dataset is not ready");

  run(function() {
    dataset = EmberObject.create({
      ready: true,
      items: A([1,2,3])
    });
    TemplateTests.datasetController.set('dataset',dataset);
  });

  equal(view.$('ul > li').length, 3, "renders the collection with the correct number of items when the dataset is ready");

  run(function() {
    secondDataset = EmberObject.create({ready: false});
    TemplateTests.datasetController.set('dataset',secondDataset);
  });

  equal(view.$().text(), "Loading", "renders the loading text when the second dataset is not ready");

  run(function() {
    view.destroy();
  });
});

test("context should be content", function() {
  var App, view;

  run(function() {
    lookup.App = App = Namespace.create();
  });

  App.items = A([
    EmberObject.create({name: 'Dave'}),
    EmberObject.create({name: 'Mary'}),
    EmberObject.create({name: 'Sara'})
  ]);

  App.AnItemView = EmberView.extend({
    template: EmberHandlebars.compile("Greetings {{name}}")
  });

  App.AView = EmberView.extend({
    template: EmberHandlebars.compile('{{collection contentBinding="App.items" itemViewClass="App.AnItemView"}}')
  });

  run(function() {
    view = App.AView.create();
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Greetings DaveGreetings MaryGreetings Sara");

  run(function() {
    view.destroy();
    App.destroy();
  });
});
