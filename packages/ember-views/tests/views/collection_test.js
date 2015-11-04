import Ember from 'ember-metal/core'; // Ember.A
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { runDestroy } from 'ember-runtime/tests/utils';
import { Mixin } from 'ember-metal/mixin';
import jQuery from 'ember-views/system/jquery';
import CollectionView, { DeprecatedCollectionView } from 'ember-views/views/collection_view';
import View from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import getElementStyle from 'ember-views/tests/test-helpers/get-element-style';
import { A as emberA } from 'ember-runtime/system/native_array';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var trim = jQuery.trim;
var owner;
var view;

var originalLookup, originalViewKeyword;

QUnit.module('CollectionView', {
  setup() {
    CollectionView.CONTAINER_MAP.del = 'em';
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    originalLookup = Ember.lookup;
    owner = buildOwner();
  },
  teardown() {
    delete CollectionView.CONTAINER_MAP.del;
    runDestroy(view);
    runDestroy(owner);

    Ember.lookup = originalLookup;
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('should render a view for each item in its content array', function() {
  view = CollectionView.create({
    content: emberA([1, 2, 3, 4])
  });

  run(function() {
    view.append();
  });
  equal(view.$('div').length, 4);
});

QUnit.test('should render the emptyView if content array is empty (view class)', function() {
  view = CollectionView.create({
    content: emberA(),

    emptyView: View.extend({
      template: compile('OY SORRY GUVNAH NO NEWS TODAY EH')
    })
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('div:contains("OY SORRY GUVNAH")').length, 'displays empty view');
});

QUnit.test('should render the emptyView if content array is empty (view class with custom tagName)', function() {
  view = CollectionView.create({
    tagName: 'del',
    content: emberA(),

    emptyView: View.extend({
      tagName: 'kbd',
      template: compile('OY SORRY GUVNAH NO NEWS TODAY EH')
    })
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 'displays empty view');
});

QUnit.test('should render the emptyView if content array is empty (view instance)', function() {
  view = CollectionView.create({
    tagName: 'del',
    content: emberA(),

    emptyView: View.create({
      tagName: 'kbd',
      template: compile('OY SORRY GUVNAH NO NEWS TODAY EH')
    })
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 'displays empty view');
});

QUnit.test('should be able to override the tag name of itemViewClass even if tag is in default mapping', function() {
  view = CollectionView.create({
    tagName: 'del',
    content: emberA(['NEWS GUVNAH']),

    itemViewClass: View.extend({
      tagName: 'kbd',
      template: compile('{{view.content}}')
    })
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("NEWS GUVNAH")').length, 'displays the item view with proper tag name');
});

QUnit.test('should allow custom item views by setting itemViewClass', function() {
  var content = emberA(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(function() {
    view.append();
  });

  content.forEach((item) => equal(view.$(':contains("' + item + '")').length, 1));
});

QUnit.test('should insert a new item in DOM when an item is added to the content array', function() {
  var content = emberA(['foo', 'bar', 'baz']);

  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(function() {
    view.append();
  });

  content.forEach((item) => {
    equal(view.$(':contains("' + item + '")').length, 1, 'precond - generates pre-existing items');
  });

  run(function() {
    content.insertAt(1, 'quux');
  });

  equal(trim(view.$(':nth-child(2)').text()), 'quux');
});

QUnit.test('should remove an item from DOM when an item is removed from the content array', function() {
  var content = emberA(['foo', 'bar', 'baz']);

  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(() => view.append());

  content.forEach((item) => {
    equal(view.$(':contains("' + item + '")').length, 1, 'precond - generates pre-existing items');
  });

  run(() => content.removeAt(1));

  content.forEach((item, idx) => {
    equal(view.$(`:nth-child(${idx + 1})`).text(), item);
  });
});

QUnit.test('it updates the view if an item is replaced', function() {
  var content = emberA(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(function() {
    view.append();
  });

  content.forEach((item) => {
    equal(view.$(':contains("' + item + '")').length, 1, 'precond - generates pre-existing items');
  });

  run(function() {
    content.removeAt(1);
    content.insertAt(1, 'Kazuki');
  });

  content.forEach((item, idx) => {
    equal(trim(view.$(`:nth-child(${idx + 1})`).text()), item, 'postcond - correct array update');
  });
});

QUnit.test('can add and replace in the same runloop', function() {
  var content = emberA(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(() => view.append());

  content.forEach((item) => {
    equal(view.$(':contains("' + item + '")').length, 1, 'precond - generates pre-existing items');
  });

  run(() => {
    content.pushObject('Tom Dale');
    content.removeAt(0);
    content.insertAt(0, 'Kazuki');
  });

  content.forEach((item, idx) => {
    equal(trim(view.$(`:nth-child(${idx + 1})`).text()), item, 'postcond - correct array update');
  });
});

QUnit.test('can add and replace the object before the add in the same runloop', function() {
  var content = emberA(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(() => view.append());

  content.forEach((item) => {
    equal(view.$(':contains("' + item + '")').length, 1, 'precond - generates pre-existing items');
  });

  run(() => {
    content.pushObject('Tom Dale');
    content.removeAt(1);
    content.insertAt(1, 'Kazuki');
  });

  content.forEach((item, idx) => {
    equal(trim(view.$(`:nth-child(${idx + 1})`).text()), item, 'postcond - correct array update');
  });
});

QUnit.test('can add and replace complicatedly', function() {
  var content = emberA(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(() => view.append());

  content.forEach((item) => {
    equal(view.$(':contains("' + item + '")').length, 1, 'precond - generates pre-existing items');
  });

  run(() => {
    content.pushObject('Tom Dale');
    content.removeAt(1);
    content.insertAt(1, 'Kazuki');
    content.pushObject('Firestone');
    content.pushObject('McMunch');
  });

  content.forEach((item, idx) => {
    equal(trim(view.$(`:nth-child(${idx + 1})`).text()), item, 'postcond - correct array update: ' + item.name + '!=' + view.$(`:nth-child(${idx + 1})`).text());
  });
});

QUnit.test('can add and replace complicatedly harder', function() {
  var content = emberA(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      template: compile('{{view.content}}')
    })
  });

  run(function() {
    view.append();
  });

  content.forEach((item) => {
    equal(view.$(':contains("' + item + '")').length, 1, 'precond - generates pre-existing items');
  });

  run(function() {
    content.pushObject('Tom Dale');
    content.removeAt(1);
    content.insertAt(1, 'Kazuki');
    content.pushObject('Firestone');
    content.pushObject('McMunch');
    content.removeAt(2);
  });

  content.forEach((item, idx) => {
    equal(trim(view.$(`:nth-child(${idx + 1})`).text()), item, 'postcond - correct array update');
  });
});

QUnit.test('should allow changes to content object before layer is created', function() {
  view = CollectionView.create({
    content: null
  });


  run(function() {
    set(view, 'content', emberA());
    set(view, 'content', emberA([1, 2, 3]));
    set(view, 'content', emberA([1, 2]));
    view.append();
  });

  ok(view.$().children().length);
});

QUnit.test('should fire life cycle events when elements are added and removed', function() {
  var view;
  var didInsertElement = 0;
  var willDestroyElement = 0;
  var willDestroy = 0;
  var destroy = 0;
  var content = emberA([1, 2, 3]);
  run(function () {
    view = CollectionView.create({
      content: content,
      itemViewClass: View.extend({
        template: compile('{{view.content}}'),
        didInsertElement() {
          didInsertElement++;
        },
        willDestroyElement() {
          willDestroyElement++;
        },
        willDestroy() {
          willDestroy++;
          this._super.apply(this, arguments);
        },
        destroy() {
          destroy++;
          this._super.apply(this, arguments);
        }
      })
    });
    view.appendTo('#qunit-fixture');
  });

  equal(didInsertElement, 3);
  equal(willDestroyElement, 0);
  equal(willDestroy, 0);
  equal(destroy, 0);
  equal(view.$().text(), '123');

  run(function () {
    content.pushObject(4);
    content.unshiftObject(0);
  });


  equal(didInsertElement, 5);
  equal(willDestroyElement, 0);
  equal(willDestroy, 0);
  equal(destroy, 0);
  // Remove whitespace added by IE 8
  equal(trim(view.$().text()), '01234');

  run(function () {
    content.popObject();
    content.shiftObject();
  });

  equal(didInsertElement, 5);
  equal(willDestroyElement, 2);
  equal(willDestroy, 2);
  equal(destroy, 2);
  // Remove whitspace added by IE 8
  equal(trim(view.$().text()), '123');

  run(function () {
    view.set('content', emberA([7, 8, 9]));
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 5);
  equal(willDestroy, 5);
  equal(destroy, 5);
  // Remove whitespace added by IE 8
  equal(trim(view.$().text()), '789');

  run(function () {
    view.destroy();
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 8);
  equal(willDestroy, 8);
  equal(destroy, 8);
});

QUnit.test('should allow changing content property to be null', function() {
  view = CollectionView.create({
    content: emberA([1, 2, 3]),

    emptyView: View.extend({
      template: compile('(empty)')
    })
  });

  run(function() {
    view.append();
  });

  equal(view.$().children().length, 3, 'precond - creates three elements');

  run(function() {
    set(view, 'content', null);
  });

  equal(trim(view.$().children().text()), '(empty)', 'should display empty view');
});

QUnit.test('should allow items to access to the CollectionView\'s current index in the content array', function() {
  view = CollectionView.create({
    content: emberA(['zero', 'one', 'two']),
    itemViewClass: View.extend({
      template: compile('{{view.contentIndex}}')
    })
  });

  run(function() {
    view.append();
  });

  deepEqual(view.$(':nth-child(1)').text(), '0');
  deepEqual(view.$(':nth-child(2)').text(), '1');
  deepEqual(view.$(':nth-child(3)').text(), '2');
});

QUnit.test('should allow declaration of itemViewClass as a string', function() {
  owner.register('view:simple-view', View.extend());

  view = CollectionView.create({
    [OWNER]: owner,
    itemViewClass: 'simple-view'
  });

  view.set('content', emberA([1, 2, 3]));

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 3);
});

QUnit.test('should not render the emptyView if content is emptied and refilled in the same run loop', function() {
  view = CollectionView.create({
    tagName: 'div',
    content: emberA(['NEWS GUVNAH']),

    emptyView: View.extend({
      tagName: 'kbd',
      template: compile('OY SORRY GUVNAH NO NEWS TODAY EH')
    })
  });

  run(function() {
    view.append();
  });

  equal(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 0);

  run(function() {
    view.get('content').popObject();
    view.get('content').pushObject(['NEWS GUVNAH']);
  });
  equal(view.$('div').length, 1);
  equal(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 0);
});

QUnit.test('when a collection view is emptied, deeply nested views elements are not removed from the DOM and then destroyed again', function() {
  var gotDestroyed = [];

  var assertProperDestruction = Mixin.create({
    destroy() {
      gotDestroyed.push(this.label);
      this._super(...arguments);
    }
  });

  var ChildView = View.extend(assertProperDestruction, {
    template: compile('{{#view view.assertDestruction}}<div class="inner_element"></div>{{/view}}'),
    label: 'parent',
    assertDestruction: View.extend(assertProperDestruction, {
      label: 'child'
    })
  });

  var view = CollectionView.create({
    content: emberA([1]),
    itemViewClass: ChildView
  });

  run(function() {
    view.append();
  });
  equal(jQuery('.inner_element').length, 1, 'precond - generates inner element');

  run(function() {
    view.get('content').clear();
  });
  equal(jQuery('.inner_element').length, 0, 'elements removed');

  run(function() {
    view.destroy();
  });

  deepEqual(gotDestroyed, ['parent', 'child'], 'The child view was destroyed');
});

QUnit.test('should render the emptyView if content array is empty and emptyView is given as string', function() {
  owner.register('view:custom-empty', View.extend({
    tagName: 'kbd',
    template: compile('THIS IS AN EMPTY VIEW')
  }));

  view = CollectionView.create({
    [OWNER]: owner,
    tagName: 'del',
    content: emberA(),
    emptyView: 'custom-empty'
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, 'displays empty view');
});

QUnit.test('should lookup against the container if itemViewClass is given as a string', function() {
  var ItemView = View.extend({
    template: compile('{{view.content}}')
  });

  owner.register('view:item', ItemView);

  view = CollectionView.create({
    [OWNER]: owner,
    itemViewClass: 'item'
  });

  view.set('content', emberA([1, 2, 3, 4]));

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 4);
});

QUnit.test('should lookup only global path against the container if itemViewClass is given as a string', function() {
  var ItemView = View.extend({
    template: compile('{{view.content}}')
  });

  owner.register('view:top', ItemView);

  view = CollectionView.create({
    [OWNER]: owner,
    itemViewClass: 'top'
  });

  view.set('content', emberA(['hi']));

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), 'hi');
});

QUnit.test('should lookup against the container and render the emptyView if emptyView is given as string and content array is empty ', function() {
  var EmptyView = View.extend({
    tagName: 'kbd',
    template: compile('THIS IS AN EMPTY VIEW')
  });

  owner.register('view:empty', EmptyView);

  view = CollectionView.create({
    [OWNER]: owner,
    tagName: 'del',
    content: emberA(),
    emptyView: 'empty'
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, 'displays empty view');
});

QUnit.test('should lookup from only global path against the container if emptyView is given as string and content array is empty ', function() {
  var EmptyView = View.extend({
    template: compile('EMPTY')
  });

  owner.register('view:top', EmptyView);

  view = CollectionView.create({
    [OWNER]: owner,
    content: emberA(),
    emptyView: 'top'
  });

  run(function() {
    view.append();
  });

  equal(view.$().text(), 'EMPTY');
});

QUnit.test('Collection with style attribute supports changing content', function() {
  view = CollectionView.create({
    attributeBindings: ['style'],
    style: 'width: 100px;',
    content: emberA(['foo', 'bar'])
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  var style = getElementStyle(view.element);

  equal(style, 'WIDTH: 100PX;', 'width is applied to the element');

  run(function() {
    view.get('content').pushObject('baz');
  });
});

QUnit.module('DeprecatedCollectionView [LEGACY]');

QUnit.test('calling reopen on DeprecatedCollectionView delegates to CollectionView', function() {
  expect(2);
  var originalReopen = CollectionView.reopen;
  var obj = {};

  CollectionView.reopen = function(arg) { ok(arg === obj); };

  expectNoDeprecation();
  DeprecatedCollectionView.reopen(obj);

  CollectionView.reopen = originalReopen;
});
