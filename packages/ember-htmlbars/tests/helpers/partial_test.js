import Ember from 'ember-metal/core'; // lookup
import EmberObject from 'ember-runtime/system/object';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import jQuery from 'ember-views/system/jquery';
var trim = jQuery.trim;
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var MyApp, lookup, view, owner;
var originalLookup = Ember.lookup;

QUnit.module('Support for {{partial}} helper', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = EmberObject.create({});
    owner = buildOwner();
    owner.registerOptionsForType('template', { instantiate: false });
  },
  teardown() {
    runDestroy(view);
    runDestroy(owner);
    Ember.lookup = originalLookup;
    view = owner = null;
  }
});

QUnit.test('should render other templates registered with the container', function() {
  owner.register('template:_subTemplateFromContainer', compile('sub-template'));

  view = EmberView.create({
    [OWNER]: owner,
    template: compile('This {{partial "subTemplateFromContainer"}} is pretty great.')
  });

  runAppend(view);

  equal(trim(view.$().text()), 'This sub-template is pretty great.');
});

QUnit.test('should render other slash-separated templates registered with the container', function() {
  owner.register('template:child/_subTemplateFromContainer', compile('sub-template'));

  view = EmberView.create({
    [OWNER]: owner,
    template: compile('This {{partial "child/subTemplateFromContainer"}} is pretty great.')
  });

  runAppend(view);

  equal(trim(view.$().text()), 'This sub-template is pretty great.');
});

QUnit.test('should use the current view\'s context', function() {
  owner.register('template:_person_name', compile('{{firstName}} {{lastName}}'));

  view = EmberView.create({
    [OWNER]: owner,
    template: compile('Who is {{partial "person_name"}}?')
  });

  view.set('controller', EmberObject.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  runAppend(view);

  equal(trim(view.$().text()), 'Who is Kris Selden?');
});

QUnit.test('Quoteless parameters passed to {{template}} perform a bound property lookup of the partial name', function() {
  owner.register('template:_subTemplate', compile('sub-template'));
  owner.register('template:_otherTemplate', compile('other-template'));

  view = EmberView.create({
    [OWNER]: owner,
    template: compile('This {{partial view.partialName}} is pretty {{partial nonexistent}}great.'),
    partialName: 'subTemplate'
  });

  runAppend(view);

  equal(trim(view.$().text()), 'This sub-template is pretty great.');

  run(function() {
    view.set('partialName', 'otherTemplate');
  });

  equal(trim(view.$().text()), 'This other-template is pretty great.');

  run(function() {
    view.set('partialName', null);
  });

  equal(trim(view.$().text()), 'This  is pretty great.');
});
