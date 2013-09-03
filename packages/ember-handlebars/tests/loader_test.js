var originalLookup = Ember.lookup, lookup, Tobias, App, view;

module("test Ember.Handlebars.bootstrap", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
  },
  teardown: function() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    if(App) { Ember.run(App, 'destroy'); }
    if (view) { Ember.run(view, 'destroy'); }
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

test('duplicated default application templates should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('default application template and id application template present should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" id="application">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('default application template and data-template-name application template present should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" data-template-name="application">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('duplicated template id should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate">first</script><script type="text/x-handlebars" id="funkyTemplate">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('duplicated template data-template-name should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">first</script><script type="text/x-handlebars" data-template-name="funkyTemplate">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

if (Ember.component) {
  test('registerComponents initializer', function(){
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    App = Ember.run(Ember.Application, 'create');

    ok(Ember.Handlebars.helpers['x-apple'], 'x-apple helper is present');
    ok(App.__container__.has('component:x-apple'), 'the container is aware of x-apple');
  });

  test('registerComponents and generated components', function(){
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    App = Ember.run(Ember.Application, 'create');
    view = App.__container__.lookup('component:x-apple');
    equal(view.get('layoutName'), 'components/x-apple', 'has correct layout name');
  });

  test('registerComponents and non-geneated components', function(){
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    Ember.run(function(){
      App = Ember.Application.create();

      // currently Component code must be loaded before initializers
      // this is mostly due to how they are bootstrapped. We will hopefully
      // sort this out soon.
      App.XAppleComponent = Ember.Component.extend({
        isCorrect: true
      });
    });

    view = App.__container__.lookup('component:x-apple');
    equal(view.get('layoutName'), 'components/x-apple', 'has correct layout name');
    ok(view.get('isCorrect'), 'ensure a non-generated component');
  });
}
