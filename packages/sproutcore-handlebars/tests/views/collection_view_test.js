// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TemplateTests */

var set = SC.set, setPath = SC.setPath;

window.TemplateTests = {};
var view;

module("SC.HandlebarsCollectionView", {
  teardown: function() {
    if (view) {
      view.destroy();
    }
  }
});

test("passing a block to the collection helper sets it as the template for example views", function() {
  TemplateTests.CollectionTestView = SC.CollectionView.extend({
    tagName: 'ul',
    content: ['foo', 'bar', 'baz']
  });

  view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label></label> {{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('label').length, 3, 'one label element is created for each content item');
});

test("if no content is passed, and no 'else' is specified, nothing is rendered", function() {
  TemplateTests.CollectionTestView = SC.CollectionView.extend({
    tagName: 'ul',
    content: []
  });

  view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('li').length, 0, 'if no "else" is specified, nothing is rendered');
});

test("if no content is passed, and 'else' is specified, the else block is rendered", function() {
  TemplateTests.CollectionTestView = SC.CollectionView.extend({
    tagName: 'ul',
    content: []
  });

  view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{ else }} <del></del> {{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('li:has(del)').length, 1, 'the else block is rendered');
});

test("a block passed to a collection helper defaults to the content property of the context", function() {
  TemplateTests.CollectionTestView = SC.CollectionView.extend({
    tagName: 'ul',
    content: ['foo', 'bar', 'baz']
  });

  view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{content}}</label> {{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('li:has(label:contains("foo")) + li:has(label:contains("bar")) + li:has(label:contains("baz"))').length, 1, 'one label element is created for each content item');
});

test("a block passed to a collection helper defaults to the view", function() {
  TemplateTests.CollectionTestView = SC.CollectionView.extend({
    tagName: 'ul',
    content: ['foo', 'bar', 'baz']
  });

  view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{content}}</label> {{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });
  equals(view.$('li:has(label:contains("foo")) + li:has(label:contains("bar")) + li:has(label:contains("baz"))').length, 1, 'precond - one aside element is created for each content item');

  SC.run(function() {
    set(view.childViews[0], 'content', []);
  });
  equals(view.$('label').length, 0, "all list item views should be removed from DOM");
});

test("should include an id attribute if id is set in the options hash", function() {
  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView" id="baz"}}foo{{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul#baz').length, 1, "adds an id attribute");
});

test("should give its item views the class specified by itemClass", function() {
  TemplateTests.itemClassTestCollectionView = SC.CollectionView.extend({
    tagName: 'ul',
    content: ['foo', 'bar', 'baz']
  });
  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.itemClassTestCollectionView" itemClass="baz"}}foo{{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul li.baz').length, 3, "adds class attribute");
});

test("should give its item views the classBinding specified by itemClassBinding", function() {
  TemplateTests.itemClassBindingTestCollectionView = SC.CollectionView.extend({
    tagName: 'ul',
    content: [SC.Object.create({ isBaz: false }), SC.Object.create({ isBaz: true }), SC.Object.create({ isBaz: true })]
  });

  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection "TemplateTests.itemClassBindingTestCollectionView" itemClassBinding="content.isBaz"}}foo{{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul li.is-baz').length, 2, "adds class on initial rendering");

  SC.run(function() {
    setPath(view.childViews[0], 'content.0.isBaz', true);
  });

  equals(view.$('ul li.is-baz').length, 3, "adds class when property changes");

  SC.run(function() {
    setPath(view.childViews[0], 'content.0.isBaz', false);
  });

  equals(view.$('ul li.is-baz').length, 2, "removes class when property changes");
});

test("should work inside a bound {{#if}}", function() {
  var testData = [SC.Object.create({ isBaz: false }), SC.Object.create({ isBaz: true }), SC.Object.create({ isBaz: true })];
  TemplateTests.ifTestCollectionView = SC.CollectionView.extend({
    tagName: 'ul',
    content: testData
  });

  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#if shouldDisplay}}{{#collection "TemplateTests.ifTestCollectionView"}}{{content.isBaz}}{{/collection}}{{/if}}'),
    shouldDisplay: true
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul li').length, 3, "renders collection when conditional is true");

  SC.run(function() { set(view, 'shouldDisplay', NO); });
  equals(view.$('ul li').length, 0, "removes collection when conditional changes to false");

  SC.run(function() { set(view, 'shouldDisplay', YES); });
  equals(view.$('ul li').length, 3, "collection renders when conditional changes to true");
});

test("should pass content as context when using {{#each}} helper", function() {
  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#each releases}}Mac OS X {{version}}: {{name}} {{/each}}'),

    releases: [ { version: '10.7',
                  name: 'Lion' },
                { version: '10.6',
                  name: 'Snow Leopard' },
                { version: '10.5',
                  name: 'Leopard' } ]
  });

  SC.run(function() { view.appendTo('#qunit-fixture'); });

  equals(view.$().text(), "Mac OS X 10.7: Lion Mac OS X 10.6: Snow Leopard Mac OS X 10.5: Leopard ", "prints each item in sequence");
});

test("should re-render when the content object changes", function() {
  TemplateTests.RerenderTest = SC.CollectionView.extend({
    tagName: 'ul',
    content: []
  });

  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection TemplateTests.RerenderTest}}{{content}}{{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  SC.run(function() {
    set(view.childViews[0], 'content', ['bing', 'bat', 'bang']);
  });

  SC.run(function() {
    set(view.childViews[0], 'content', ['ramalamadingdong']);
  });

  equals(view.$('li').length, 1, "rerenders with correct number of items");
  equals(view.$('li:eq(0)').text(), "ramalamadingdong");

});

test("select tagName on collection helper automatically sets child tagName to option", function() {
  TemplateTests.RerenderTest = SC.CollectionView.extend({
    content: ['foo']
  });
  
  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="select"}}{{content}}{{/collection}}')
  });
  
  SC.run(function() {
    view.appendTo('qunit-fixture');
  });
  
  equals(view.$('option').length, 1, "renders the correct child tag name");
  
});

test("tagName works in the #collection helper", function() {
  TemplateTests.RerenderTest = SC.CollectionView.extend({
    content: ['foo', 'bar']
  });

  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="ol"}}{{content}}{{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ol').length, 1, "renders the correct tag name");
  equals(view.$('li').length, 2, "rerenders with correct number of items");

  SC.run(function() {
    set(view.childViews[0], 'content', ['bing', 'bat', 'bang']);
  });

  equals(view.$('li').length, 3, "rerenders with correct number of items");
  equals(view.$('li:eq(0)').text(), "bing");
});

test("should render nested collections", function() {

  TemplateTests.InnerList = SC.CollectionView.extend({
    tagName: 'ul',
    content: ['one','two','three']
  });

  TemplateTests.OuterList = SC.CollectionView.extend({
    tagName: 'ul',
    content: ['foo']
  });

  var view = SC.View.create({
    template: SC.Handlebars.compile('{{#collection TemplateTests.OuterList class="outer"}}{{content}}{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{/collection}}')
  });

  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('ul.outer > li').length, 1, "renders the outer list with correct number of items");
  equals(view.$('ul.inner').length, 1, "the inner list exsits");
  equals(view.$('ul.inner > li').length, 3, "renders the inner list with correct number of items");

});

