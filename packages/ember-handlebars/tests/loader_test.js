/*global Tobias:true*/

module("test Ember.Handlebars.bootstrap", {
  teardown: function() {
    Ember.TEMPLATES = {};
    window.Tobias = undefined;
  }
});

test('template with data-template-name should add a new template to Ember.TEMPLATES', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate" >{{Tobias.firstName}} {{Tobias.lastName}}</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
    Tobias = Ember.Object.create({
      firstName: 'Tobias',
      lastName: 'Fünke'
    });
  });

  ok(Ember.TEMPLATES['funkyTemplate'], 'template with name funkyTemplate available');
  equal(Ember.$('#qunit-fixture').text(), '', 'no template content is added');
});

test('template with id instead of data-template-name should add a new template to Ember.TEMPLATES', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate" >{{Tobias.firstName}} takes {{Tobias.drug}}</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
    Tobias = Ember.Object.create({
      firstName: 'Tobias',
      drug: 'teamocil'
    });
  });

  ok(Ember.TEMPLATES['funkyTemplate'], 'template with name funkyTemplate available');
  equal(Ember.$('#qunit-fixture').text(), '', 'no template content is added');
});

test('inline template should be added', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" >{{Tobias.firstName}} {{Tobias.lastName}}</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
    Tobias = Ember.Object.create({
      firstName: 'Tobias',
      lastName: 'Fünke'
    });
  });

  equal(Ember.$('#qunit-fixture').text(), 'Tobias Fünke', 'template is rendered');
});

test('template with data-tag-name should add a template, wrapped in specific tag', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" data-tag-name="h1" >{{Tobias.firstName}} takes {{Tobias.drug}}</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
    Tobias = Ember.Object.create({
      firstName: 'Tobias',
      drug: 'teamocil'
    });
  });

  equal(Ember.$('#qunit-fixture h1').text(), 'Tobias takes teamocil', 'template is rendered inside custom tag');
});

test('template with data-element-id should add an id attribute to the view', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" data-element-id="application">Hello World !</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  });

  equal(Ember.$('#qunit-fixture #application').text(), 'Hello World !', 'view exists with id');
});

test('template without data-element-id should still get an attribute', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">Hello World!</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  });

  var id = Ember.$('#qunit-fixture .ember-view').attr('id');
  ok(id && /^ember\d+$/.test(id), "has standard Ember id");
});

test('template with type text/html should work if LEGACY_HANDLEBARS_TAGS is true', function() {
  Ember.ENV.LEGACY_HANDLEBARS_TAGS = true;

  try {
    Ember.$('#qunit-fixture').html('<script type="text/html" data-template-name="funkyTemplate">Tobias Fünke</script>');

    Ember.run(function() {
      Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
    });

    ok(Ember.TEMPLATES['funkyTemplate'], 'template with name funkyTemplate available');
  } finally {
    Ember.ENV.LEGACY_HANDLEBARS_TAGS = false;
  }
});

test('template with type text/x-raw-handlebars should be parsed', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-raw-handlebars" data-template-name="funkyTemplate">{{name}}</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  });

  ok(Ember.TEMPLATES['funkyTemplate'], 'template with name funkyTemplate available');

  // This won't even work with Ember templates
  equal(Ember.TEMPLATES['funkyTemplate']({ name: 'Tobias' }), "Tobias");
});
