/*jshint newcap:false*/
import CollectionView from "ember-views/views/collection_view";
import EmberObject from "ember-runtime/system/object";
import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars";
import ArrayProxy from "ember-runtime/system/array_proxy";
import Namespace from "ember-runtime/system/namespace";
import Container from "ember-runtime/system/container";
import { A } from "ember-runtime/system/native_array";
import run from "ember-metal/run_loop";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import jQuery from "ember-views/system/jquery";
import { computed } from "ember-metal/computed";

var trim = jQuery.trim;

import htmlbarsCompile from "ember-htmlbars/system/compile";
var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var view;

var originalLookup = Ember.lookup;
var TemplateTests, container, lookup;


function nthChild(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
}

var firstChild = nthChild;

function firstGrandchild(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
}

QUnit.module("collection helper", {
  setup: function() {
    Ember.lookup = lookup = {};
    lookup.TemplateTests = TemplateTests = Namespace.create();
    container = new Container();
    container.optionsForType('template', { instantiate: false });
    // container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },

  teardown: function() {
    run(function() {
        if (container) {
          container.destroy();
        }
        if (view) {
          view.destroy();
        }
        container = view = null;
    });
    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;
  }
});

test("Collection views that specify an example view class have their children be of that class", function() {
  var ExampleViewCollection = CollectionView.extend({
    itemViewClass: EmberView.extend({
      isCustom: true
    }),

    content: A(['foo'])
  });

  view = EmberView.create({
    exampleViewCollection: ExampleViewCollection,
    template: compile('{{#collection view.exampleViewCollection}}OHAI{{/collection}}')
  });

  run(function() {
    view.append();
  });

  ok(firstGrandchild(view).isCustom, "uses the example view class");
});

test("itemViewClass works in the #collection helper with a global (DEPRECATED)", function() {
  TemplateTests.ExampleItemView = EmberView.extend({
    isAlsoCustom: true
  });

  view = EmberView.create({
    exampleController: ArrayProxy.create({
      content: A(['alpha'])
    }),
    template: compile('{{#collection content=view.exampleController itemViewClass=TemplateTests.ExampleItemView}}beta{{/collection}}')
  });

  var deprecation = /Resolved the view "TemplateTests.ExampleItemView" on the global context/;
  if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
    deprecation = /Global lookup of TemplateTests.ExampleItemView from a Handlebars template is deprecated/;
  }
  expectDeprecation(function(){
    run(view, 'append');
  }, deprecation);

  ok(firstGrandchild(view).isAlsoCustom, "uses the example view class specified in the #collection helper");
});

test("itemViewClass works in the #collection helper with a property", function() {
  var ExampleItemView = EmberView.extend({
    isAlsoCustom: true
  });

  var ExampleCollectionView = CollectionView;

  view = EmberView.create({
    possibleItemView: ExampleItemView,
    exampleCollectionView: ExampleCollectionView,
    exampleController: ArrayProxy.create({
      content: A(['alpha'])
    }),
    template: compile('{{#collection view.exampleCollectionView content=view.exampleController itemViewClass=view.possibleItemView}}beta{{/collection}}')
  });

  run(function() {
    view.append();
  });

  ok(firstGrandchild(view).isAlsoCustom, "uses the example view class specified in the #collection helper");
});

test("itemViewClass works in the #collection via container", function() {
  container.register('view:example-item', EmberView.extend({
    isAlsoCustom: true
  }));

  view = EmberView.create({
    container: container,
    exampleCollectionView: CollectionView.extend(),
    exampleController: ArrayProxy.create({
      content: A(['alpha'])
    }),
    template: compile('{{#collection view.exampleCollectionView content=view.exampleController itemViewClass="example-item"}}beta{{/collection}}')
  });

  run(function() {
    view.append();
  });

  ok(firstGrandchild(view).isAlsoCustom, "uses the example view class specified in the #collection helper");
});


test("passing a block to the collection helper sets it as the template for example views", function() {
  var CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    collectionTestView: CollectionTestView,
    template: compile('{{#collection view.collectionTestView}} <label></label> {{/collection}}')
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
    template: compile('{{#collection "collectionTest"}} <label></label> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('label').length, 3, 'one label element is created for each content item');
});

test("collection helper should accept relative paths", function() {
  view = EmberView.create({
    template: compile('{{#collection view.collection}} <label></label> {{/collection}}'),
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
  var EmptyView = EmberView.extend({
    template : compile("<td>No Rows Yet</td>")
  });

  var ListView = CollectionView.extend({
    emptyView: EmptyView
  });

  var listController = ArrayProxy.create({
    content : A()
  });

  view = EmberView.create({
    listView: ListView,
    listController: listController,
    template: compile('{{#collection view.listView content=view.listController tagName="table"}} <td>{{view.content.title}}</td> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('tr').length, 1, 'Make sure the empty view is there (regression)');

  run(function() {
    listController.pushObject({title : "Go Away, Placeholder Row!"});
  });

  equal(view.$('tr').length, 1, 'has one row');
  equal(view.$('tr:nth-child(1) td').text(), 'Go Away, Placeholder Row!', 'The content is the updated data.');
});

test("should be able to specify which class should be used for the empty view", function() {
  var App;

  run(function() {
    lookup.App = App = Namespace.create();
  });

  var EmptyView = EmberView.extend({
    template: compile('This is an empty view')
  });

  view = EmberView.create({
    container: {
      lookupFactory: function(){
        return EmptyView;
      }
    },
    template: compile('{{collection emptyViewClass="empty-view"}}')
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
  var CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A()
  });

  view = EmberView.create({
    collectionTestView: CollectionTestView,
    template: compile('{{#collection view.collectionTestView}} <aside></aside> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li').length, 0, 'if no "else" is specified, nothing is rendered');
});

test("if no content is passed, and 'else' is specified, the else block is rendered", function() {
  var CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A()
  });

  view = EmberView.create({
    collectionTestView: CollectionTestView,
    template: compile('{{#collection view.collectionTestView}} <aside></aside> {{ else }} <del></del> {{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li:has(del)').length, 1, 'the else block is rendered');
});

test("a block passed to a collection helper defaults to the content property of the context", function() {
  var CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    collectionTestView: CollectionTestView,
    template: compile('{{#collection view.collectionTestView}} <label>{{view.content}}</label> {{/collection}}')
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
  var CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    collectionTestView: CollectionTestView,
    template: compile('{{#collection view.collectionTestView}} <label>{{view.content}}</label> {{/collection}}')
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
  var CollectionTestView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });

  view = EmberView.create({
    collectionTestView: CollectionTestView,
    template: compile('{{#collection view.collectionTestView id="baz"}}foo{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul#baz').length, 1, "adds an id attribute");
});

test("should give its item views the class specified by itemClass", function() {
  var ItemClassTestCollectionView = CollectionView.extend({
    tagName: 'ul',
    content: A(['foo', 'bar', 'baz'])
  });
  view = EmberView.create({
    itemClassTestCollectionView: ItemClassTestCollectionView,
    template: compile('{{#collection view.itemClassTestCollectionView itemClass="baz"}}foo{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.baz').length, 3, "adds class attribute");
});

test("should give its item views the classBinding specified by itemClassBinding", function() {
  var ItemClassBindingTestCollectionView = CollectionView.extend({
    tagName: 'ul',
    content: A([EmberObject.create({ isBaz: false }), EmberObject.create({ isBaz: true }), EmberObject.create({ isBaz: true })])
  });

  view = EmberView.create({
    itemClassBindingTestCollectionView: ItemClassBindingTestCollectionView,
    isBar: true,
    template: compile('{{#collection view.itemClassBindingTestCollectionView itemClassBinding="view.isBar"}}foo{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.is-bar').length, 3, "adds class on initial rendering");

  // NOTE: in order to bind an item's class to a property of the item itself (e.g. `isBaz` above), it will be necessary
  // to introduce a new keyword that could be used from within `itemClassBinding`. For instance, `itemClassBinding="item.isBaz"`.
});

test("should give its item views the property specified by itemPropertyBinding", function() {
  var ItemPropertyBindingTestItemView = EmberView.extend({
    tagName: 'li'
  });

  // Use preserveContext=false so the itemView handlebars context is the view context
  // Set itemView bindings using item*
  view = EmberView.create({
    baz: "baz",
    content: A([EmberObject.create(), EmberObject.create(), EmberObject.create()]),
    container: {
      lookupFactory: function(){
        return ItemPropertyBindingTestItemView;
      }
    },
    template: compile('{{#collection contentBinding="view.content" tagName="ul" itemViewClass="item-property-binding-test-item-view" itemPropertyBinding="view.baz" preserveContext=false}}{{view.property}}{{/collection}}')
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

test("should unsubscribe stream bindings", function() {
  view = EmberView.create({
    baz: "baz",
    content: A([EmberObject.create(), EmberObject.create(), EmberObject.create()]),
    template: compile('{{#collection contentBinding="view.content" itemPropertyBinding="view.baz"}}{{view.property}}{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  var barStreamBinding = view._streamBindings['view.baz'];

  equal(barStreamBinding.subscribers.length, 3*2, "adds 3 subscribers");

  run(function() {
    view.get('content').popObject();
  });

  equal(barStreamBinding.subscribers.length, 2*2, "removes 1 subscriber");
});

test("should work inside a bound {{#if}}", function() {
  var testData = A([EmberObject.create({ isBaz: false }), EmberObject.create({ isBaz: true }), EmberObject.create({ isBaz: true })]);
  var IfTestCollectionView = CollectionView.extend({
    tagName: 'ul',
    content: testData
  });

  view = EmberView.create({
    ifTestCollectionView: IfTestCollectionView,
    template: compile('{{#if view.shouldDisplay}}{{#collection view.ifTestCollectionView}}{{content.isBaz}}{{/collection}}{{/if}}'),
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

test("should pass content as context when using {{#each}} helper [DEPRECATED]", function() {
  view = EmberView.create({
    template: compile('{{#each view.releases}}Mac OS X {{version}}: {{name}} {{/each}}'),

    releases: A([
                { version: '10.7',
                  name: 'Lion' },
                { version: '10.6',
                  name: 'Snow Leopard' },
                { version: '10.5',
                  name: 'Leopard' }
              ])
  });

  expectDeprecation(function() {
    run(view, 'appendTo', '#qunit-fixture');
  }, 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$().text(), "Mac OS X 10.7: Lion Mac OS X 10.6: Snow Leopard Mac OS X 10.5: Leopard ", "prints each item in sequence");
});

test("should re-render when the content object changes", function() {
  var RerenderTest = CollectionView.extend({
    tagName: 'ul',
    content: A()
  });

  view = EmberView.create({
    rerenderTestView: RerenderTest,
    template: compile('{{#collection view.rerenderTestView}}{{view.content}}{{/collection}}')
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
  var RerenderTest = CollectionView.extend({
    content: A(['foo'])
  });

  view = EmberView.create({
    rerenderTestView: RerenderTest,
    template: compile('{{#collection view.rerenderTestView tagName="select"}}{{view.content}}{{/collection}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('option').length, 1, "renders the correct child tag name");

});

test("tagName works in the #collection helper", function() {
  var RerenderTest = CollectionView.extend({
    content: A(['foo', 'bar'])
  });

  view = EmberView.create({
    rerenderTestView: RerenderTest,
    template: compile('{{#collection view.rerenderTestView tagName="ol"}}{{view.content}}{{/collection}}')
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

  var container = new Container();
  container.register('view:inner-list', CollectionView.extend({
    tagName: 'ul',
    content: A(['one','two','three'])
  }));

  container.register('view:outer-list', CollectionView.extend({
    tagName: 'ul',
    content: A(['foo'])
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{#collection "outer-list" class="outer"}}{{content}}{{#collection "inner-list" class="inner"}}{{content}}{{/collection}}{{/collection}}')
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

    var InnerList = CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'parentView.innerListContent'
    });

    var OuterListItem = EmberView.extend({
      innerListView: InnerList,
      template: compile('{{#collection view.innerListView class="inner"}}{{content}}{{/collection}}{{content}}'),
      innerListContent: computed(function() {
        return A([1,2,3]);
      })
    });

    var OuterList = CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'TemplateTests.contentController',
      itemViewClass: OuterListItem
    });

    view = EmberView.create({
      outerListView: OuterList,
      template: compile('{{collection view.outerListView class="outer"}}')
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

    var ExampleCollectionView = CollectionView.extend({
      contentBinding: 'parentView.items',
      tagName: 'ul',
      template: compile("{{view.content}}")
    });

    var ReportingView = EmberView.extend({
      exampleCollectionView: ExampleCollectionView,
      datasetBinding: 'TemplateTests.datasetController.dataset',
      readyBinding: 'dataset.ready',
      itemsBinding: 'dataset.items',
      template: compile("{{#if view.ready}}{{collection view.exampleCollectionView}}{{else}}Loading{{/if}}")
    });

    view = ReportingView.create();
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
  var view;

  var container = new Container();

  var items = A([
    EmberObject.create({name: 'Dave'}),
    EmberObject.create({name: 'Mary'}),
    EmberObject.create({name: 'Sara'})
  ]);

  container.register('view:an-item', EmberView.extend({
    template: compile("Greetings {{name}}")
  }));

  view = EmberView.create({
    container: container,
    controller: {
      items: items
    },
    template: compile('{{collection contentBinding="items" itemViewClass="an-item"}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Greetings DaveGreetings MaryGreetings Sara");

  run(view, 'destroy');
});
