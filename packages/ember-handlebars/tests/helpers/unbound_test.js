var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = function(template) {
  return Ember.Handlebars.compile(template);
};

var view;

module("Handlebars {{unbound}} helpers", {
  teardown: function() {
    Ember.run(function () {
      if (view) {
        view.destroy();
      }
    });
  }
});

module("{{unbound}}");
test("unbound should output the property", function() {
  view = Ember.View.create({
    mrStubborn: 'NO!',
    template: Ember.Handlebars.compile("Do you like anything? {{unbound view.mrStubborn}}")
  });
  appendView(view);
  equal(view.$().text(), "Do you like anything? NO!");
});

test("property will not update when unbound", function() {
  view = Ember.View.create({
    mrStubborn: 'NO!',
    template: Ember.Handlebars.compile("Do you like anything? {{unbound view.mrStubborn}}")
  });
  appendView(view);

  Ember.run(function () {
    view.set('mrStubborn', 'YES!');
  });
  
  equal(view.$().text(), "Do you like anything? NO!");  
});

module("{{unboundIf}}");
test("unboundIf should output if the condition is true", function() {
  view = Ember.View.create({
    cool: true,
    template: Ember.Handlebars.compile("{{#unboundIf view.cool}}sgb{{/unboundIf}}")
  });
  appendView(view);
  equal(view.$().text(), "sgb");  
});

test("unboundIf doesn't output if the condition is false", function() {
  view = Ember.View.create({
    cool: false,
    template: Ember.Handlebars.compile("{{#unboundIf view.cool}}sgb{{/unboundIf}}")
  });
  appendView(view);
  equal(view.$().text(), "");  
});

test("unboundIf doesn't output again if the condition changes", function() {
  view = Ember.View.create({
    cool: true,
    template: Ember.Handlebars.compile("{{#unboundIf view.cool}}sgb{{/unboundIf}}")
  });
  appendView(view);
  Ember.run(function () {
    view.set('cool', false);
  });
  equal(view.$().text(), "sgb");  
});

module("{{unboundUnless}}");
test("unboundUnless should output if the condition is false", function() {
  view = Ember.View.create({
    cool: false,
    template: Ember.Handlebars.compile("{{#unboundUnless view.cool}}sbb{{/unboundUnless}}")
  });
  appendView(view);
  equal(view.$().text(), "sbb");  
});

test("unboundUnless doesn't output if the condition is false", function() {
  view = Ember.View.create({
    cool: true,
    template: Ember.Handlebars.compile("{{#unboundUnless view.cool}}sbb{{/unboundUnless}}")
  });
  appendView(view);
  equal(view.$().text(), "");  
});

test("unboundUnless doesn't output again if the condition changes", function() {
  view = Ember.View.create({
    cool: false,
    template: Ember.Handlebars.compile("{{#unboundUnless view.cool}}sbb{{/unboundUnless}}")
  });
  appendView(view);
  Ember.run(function () {
    view.set('cool', true);
  });
  equal(view.$().text(), "sbb");  
});


test("unbound all output within a block", function() {
  view = Ember.View.create({
    occasion: 'bar mitzvah',
    notSpooky: false,
    werewolf: true,
    template: Ember.Handlebars.compile("{{#unbound}}{{occasion}}: {{#unless notSpooky}}spooky! {{/unless}}{{#if werewolf}}scary!{{/if}}{{/unbound}}")
  });
  appendView(view);
  equal(view.$().text(), "bar mitzvah: spooky! scary!");  
});

test("unbound blocks don't change", function() {
  view = Ember.View.create({
    occasion: 'bar mitzvah',
    notSpooky: false,
    werewolf: true,
    template: Ember.Handlebars.compile("{{#unbound}}{{occasion}}: {{#unless notSpooky}}spooky! {{/unless}}{{#if werewolf}}scary!{{/if}}{{/unbound}}")
  });
  appendView(view);
  Ember.run(function () {
    view.set('occasion', 'wedding');
    view.set('werewolf', false);
    view.set('notSpooky', true);
  });
  equal(view.$().text(), "bar mitzvah: spooky! scary!");  
});

