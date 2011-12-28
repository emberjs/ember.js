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
    templateName: 'person-contact',
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




