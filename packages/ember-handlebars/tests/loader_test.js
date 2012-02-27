/*global Tobias:true*/

module("test Ember.Handlebars.bootstrap", {
  teardown: function() {
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

// TODO: Text x-raw-handlebars
