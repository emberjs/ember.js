var originalLookup = Ember.lookup, lookup, Tobias;

module("test Ember.Handlebars.bootstrap", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
  },
  teardown: function() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
  }
});

function checkTemplate(templateName) {
  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  });
  var template = Ember.TEMPLATES[templateName];
  ok(template, 'template is available on Ember.TEMPLATES');
  equal(Ember.$('#qunit-fixture script').length, 0, 'script removed');
  var view = Ember.View.create({
    template: template,
    context: {
      firstName: 'Tobias',
      drug: 'teamocil'
    }
  });
  Ember.run(function() {
    view.createElement();
  });
  equal(Ember.$.trim(view.$().text()), 'Tobias takes teamocil', 'template works');
  Ember.run(function() {
    view.destroy();
  });
}

test('template with data-template-name should add a new template to Ember.TEMPLATES', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

test('template with id instead of data-template-name should add a new template to Ember.TEMPLATES', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate" >{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

test('template without data-template-name or id should default to application', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">{{firstName}} takes {{drug}}</script>');

  checkTemplate('application');
});

test('template with type text/x-raw-handlebars should be parsed', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-raw-handlebars" data-template-name="funkyTemplate">{{name}}</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  });

  ok(Ember.TEMPLATES['funkyTemplate'], 'template with name funkyTemplate available');

  // This won't even work with Ember templates
  equal(Ember.$.trim(Ember.TEMPLATES['funkyTemplate']({ name: 'Tobias' })), "Tobias");
});
