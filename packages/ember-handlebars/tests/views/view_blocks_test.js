// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TemplateTests, Ember, minispade */

var set = Ember.set, get = Ember.get, setPath = Ember.setPath;

var view;

module("ember-handlebars/tests/views/view_blocks_test", {
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

test("block support in template (#307)", function() {
  TemplateTests.BlockContainer = Ember.View.extend({
	  template: Ember.Handlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>') 
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view TemplateTests.BlockContainer title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
});


test("Block should receive the calling view's templateContext as the context", function() {
  TemplateTests.phone = Ember.Object.create({
    name: 'mobile',
    number: '404-555-1234'
  });
  
  TemplateTests.person = Ember.Object.create({
    name: 'Raghu Rajah',
    phone: TemplateTests.phone
  });
  
  TemplateTests.PhoneDialer = Ember.View.extend({
	  template: Ember.Handlebars.compile('<div class="dialer"><div id="owner" {{bindAttr class=content.name}}>{{yield}}</div><div class="phone-number">{{content.number}}</div></div>')
  });

  TemplateTests.PersonContact = Ember.View.extend({
	  template: Ember.Handlebars.compile('<div class="contact"><h1>{{content.name}}</h1>{{#view TemplateTests.PhoneDialer contentBinding="content.phone"}}{{content.name}}{{/view}}</div>')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view TemplateTests.PersonContact contentBinding="TemplateTests.person"}}{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('#owner').text(), TemplateTests.person.name, 'person is sent in as context to the child block inside phone');
});

test("Block should work properly even when templates are not hard-coded", function() {
  var templates = Ember.Object.create({
    nester: Ember.Handlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>'),
    nested: Ember.Handlebars.compile('{{#view TemplateTests.BlockContainer title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}')
  });

  TemplateTests.BlockContainer = Ember.View.extend({
	  templateName: 'nester',
	  templates: templates
  });

  view = Ember.View.create({
    templateName: 'nested',
    templates: templates
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
  
});

test("Templates should yield to block, when the yield is embedded in a hierarchy of virtual views", function() {
  TemplateTests.TimesView = Ember.View.extend({
    template: Ember.Handlebars.compile('<div class="times">{{#each index}}{{yield}}{{/each}}</div>'),
    n: null,
    index: Ember.computed(function() {
      var n = Ember.get(this, 'n'), indexArray = Ember.A([]);
      for (var i=0; i < n; i++) {
        indexArray[i] = i;
      }
      return indexArray;
    }).cacheable()
  });
  
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container"><div class="title">Counting to 5</div>{{#view TemplateTests.TimesView n=5}}<div class="times-item">Hello</div>{{/view}}</div>')
  });
  
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('div#container div.times-item').length, 5, 'times-item is embedded within wrapping container 5 times, as expected');
});

test("Templates should yield to block, when the yield is embedded in a hierarchy of non-virtual views", function() {
  TemplateTests.NestingView = Ember.View.extend({
    template: Ember.Handlebars.compile('{{#view Ember.View tagName="div" classNames="nesting"}}{{debugger}}{{yield}}{{/view}}')
  });
  
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container">{{#view TemplateTests.NestingView}}<div id="block">Hello</div>{{/view}}</div>')
  });
  
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('div#container div.nesting div#block').length, 1, 'nesting view yields correctly even within a view hierarchy in the nesting view');
});

test("Block should be able to pass parameters to yielded block", function() {
  TemplateTests.TimesView = Ember.View.extend({
    template: Ember.Handlebars.compile('<div class="times">{{#each index}}{{yield count=this}}{{/each}}</div>'),
    n: null,
    index: Ember.computed(function() {
      var n = Ember.get(this, 'n'), indexArray = Ember.A([]);
      for (var i=0; i < n; i++) {
        indexArray[i] = i;
      }
      return indexArray;
    }).cacheable()
  });
  
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container"><div class="title">Counting to 5</div>{{#view TemplateTests.TimesView n=5}}<div class="times-item">{{count}}</div>{{/view}}</div>')
  });
  
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equals(view.$('div#container div.times-item').length, 5, 'times-item is embedded within wrapping container 5 times, as expected');
});
