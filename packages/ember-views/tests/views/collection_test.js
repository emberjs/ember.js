import Ember from "ember-metal/core"; // Ember.A
import { set } from "ember-metal/property_set";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import { forEach } from "ember-metal/enumerable_utils";
import { Mixin } from "ember-metal/mixin";
import { fmt } from "ember-runtime/system/string";
import ArrayProxy from "ember-runtime/system/array_proxy";
import ArrayController from "ember-runtime/controllers/array_controller";
import jQuery from "ember-views/system/jquery";
import CollectionView from "ember-views/views/collection_view";
import View from "ember-views/views/view";

var trim = jQuery.trim;
var view;

var originalLookup;

QUnit.module("CollectionView", {
  setup: function() {
    CollectionView.CONTAINER_MAP.del = 'em';
    originalLookup = Ember.lookup;
  },
  teardown: function() {
    delete CollectionView.CONTAINER_MAP.del;
    run(function() {
      if (view) { view.destroy(); }
    });

    Ember.lookup = originalLookup;
  }
});

test("should render a view for each item in its content array", function() {
  view = CollectionView.create({
    content: Ember.A([1, 2, 3, 4])
  });

  run(function() {
    view.append();
  });
  equal(view.$('div').length, 4);
});

test("should render the emptyView if content array is empty (view class)", function() {
  view = CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should render the emptyView if content array is empty (view instance)", function() {
  view = CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: View.create({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should be able to override the tag name of itemViewClass even if tag is in default mapping", function() {
  view = CollectionView.create({
    tagName: 'del',
    content: Ember.A(['NEWS GUVNAH']),

    itemViewClass: View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("NEWS GUVNAH")').length, "displays the item view with proper tag name");
});

test("should allow custom item views by setting itemViewClass", function() {
  var passedContents = [];
  view = CollectionView.create({
    content: Ember.A(['foo', 'bar', 'baz']),

    itemViewClass: View.extend({
      render: function(buf) {
        passedContents.push(get(this, 'content'));
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  deepEqual(passedContents, ['foo', 'bar', 'baz'], "sets the content property on each item view");

  forEach(passedContents, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1);
  });
});

test("should insert a new item in DOM when an item is added to the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  run(function() {
    content.insertAt(1, 'quux');
  });

  equal(trim(view.$(':nth-child(2)').text()), 'quux');
});

test("should remove an item from DOM when an item is removed from the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  run(function() {
    content.removeAt(1);
  });

  forEach(content, function(item, idx) {
    equal(view.$(fmt(':nth-child(%@)', [String(idx+1)])).text(), item);
  });
});

test("it updates the view if an item is replaced", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  run(function() {
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(trim(view.$(fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("can add and replace in the same runloop", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(0);
    content.insertAt(0, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(trim(view.$(fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });

});

test("can add and replace the object before the add in the same runloop", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(trim(view.$(fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("can add and replace complicatedly", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
    content.pushObject("Firestone" );
    content.pushObject("McMunch" );
  });

  forEach(content, function(item, idx) {
    equal(trim(view.$(fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update: "+item.name+"!="+view.$(fmt(':nth-child(%@)', [String(idx+1)])).text());
  });
});

test("can add and replace complicatedly harder", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = CollectionView.create({
    content: content,

    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
    content.pushObject("Firestone" );
    content.pushObject("McMunch" );
    content.removeAt(2);
  });

  forEach(content, function(item, idx) {
    equal(trim(view.$(fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("should allow changes to content object before layer is created", function() {
  view = CollectionView.create({
    content: null
  });


  run(function() {
    set(view, 'content', Ember.A());
    set(view, 'content', Ember.A([1, 2, 3]));
    set(view, 'content', Ember.A([1, 2]));
    view.append();
  });

  ok(view.$().children().length);
});

test("should fire life cycle events when elements are added and removed", function() {
  var view;
  var didInsertElement = 0;
  var willDestroyElement = 0;
  var willDestroy = 0;
  var destroy = 0;
  var content = Ember.A([1, 2, 3]);
  run(function () {
    view = CollectionView.create({
      content: content,
      itemViewClass: View.extend({
        render: function(buf) {
          buf.push(get(this, 'content'));
        },
        didInsertElement: function () {
          didInsertElement++;
        },
        willDestroyElement: function () {
          willDestroyElement++;
        },
        willDestroy: function () {
          willDestroy++;
          this._super();
        },
        destroy: function() {
          destroy++;
          this._super();
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
  // Remove whitspace added by IE 8
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
    view.set('content', Ember.A([7,8,9]));
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 5);
  equal(willDestroy, 5);
  equal(destroy, 5);
  // Remove whitspace added by IE 8
  equal(trim(view.$().text()), '789');

  run(function () {
    view.destroy();
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 8);
  equal(willDestroy, 8);
  equal(destroy, 8);
});

test("should allow changing content property to be null", function() {
  view = CollectionView.create({
    content: Ember.A([1, 2, 3]),

    emptyView: View.extend({
      template: function() { return "(empty)"; }
    })
  });

  run(function() {
    view.append();
  });

  equal(view.$().children().length, 3, "precond - creates three elements");

  run(function() {
    set(view, 'content', null);
  });

  equal(trim(view.$().children().text()), "(empty)", "should display empty view");
});

test("should allow items to access to the CollectionView's current index in the content array", function() {
  view = CollectionView.create({
    content: Ember.A(['zero', 'one', 'two']),
    itemViewClass: View.extend({
      render: function(buf) {
        buf.push(get(this, 'contentIndex'));
      }
    })
  });

  run(function() {
    view.append();
  });

  deepEqual(view.$(':nth-child(1)').text(), "0");
  deepEqual(view.$(':nth-child(2)').text(), "1");
  deepEqual(view.$(':nth-child(3)').text(), "2");
});

test("should allow declaration of itemViewClass as a string", function() {
  var container = {
    lookupFactory: function(){
      return Ember.View.extend();
    }
  };

  view = CollectionView.create({
    container: container,
    content: Ember.A([1, 2, 3]),
    itemViewClass: 'simple-view'
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 3);
});

test("should not render the emptyView if content is emptied and refilled in the same run loop", function() {
  view = CollectionView.create({
    tagName: 'div',
    content: Ember.A(['NEWS GUVNAH']),

    emptyView: View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
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

test("a array_proxy that backs an sorted array_controller that backs a collection view functions properly", function() {

  var array = Ember.A([{ name: "Other Katz" }]);
  var arrayProxy = ArrayProxy.create({content: array});

  var sortedController = ArrayController.create({
    content: arrayProxy,
    sortProperties: ['name']
  });

  var container = CollectionView.create({
    content: sortedController
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  run(function() {
    arrayProxy.addObjects([{ name: "Scumbag Demon" }, { name: "Lord British" }]);
  });

  equal(container.get('content.length'), 3, 'ArrayController should have 3 entries');
  equal(container.get('content.content.length'), 3, 'RecordArray should have 3 entries');
  equal(container.get('childViews.length'), 3, 'CollectionView should have 3 entries');

  run(function() {
    container.destroy();
  });
});

test("a collection view backed by an array_proxy whose arrangedContent is a computedProperty relying on its own content should make the correct changes to its child views when the array_proxy's content is modified", function() {

  var arrangedArray = ArrayProxy.extend({
    arrangedContent: Ember.computed('content.[]', function() {
      return this.get('content');
    })
  });
  var array = Ember.A(['firstItem']);
  var arrayProxy = arrangedArray.create({
    content: array
  });

  var container = CollectionView.create({
    content: arrayProxy
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.get('content.length'), 1, 'CollectionView.content should have 1 entries');
  equal(container.get('childViews.length'), 1, 'CollectionView.childViews should have 1 entries');

  run(function() {
    arrayProxy.set('content', Ember.A(['newFirstItem']));
  });

  equal(container.get('content.length'), 1, 'CollectionView.content should still have 1 entries');
  equal(container.get('childViews.length'), 1, 'CollectionView.childViews should still have 1 entries');
  equal(container.get('childViews.firstObject.content'), 'newFirstItem', 'CollectionView.childView.firstObject.content should match the first object in the content array');

  run(function() {
    arrayProxy.get('content').pushObject('secondItem');
  });

  equal(container.get('content.length'), 2, 'CollectionView.content should have 2 entries');
  equal(container.get('childViews.length'), 2, 'CollectionView.childViews should have 2 entries');

  run(function() {
    arrayProxy.get('content').removeObject('secondItem');
  });

  equal(container.get('content.length'), 1, 'CollectionView.content should have 1 entries');
  equal(container.get('childViews.length'), 1, 'CollectionView.childViews should have 1 entries');

  run(function() {
    container.destroy();
  });
});

test("when a collection view is emptied, deeply nested views elements are not removed from the DOM and then destroyed again", function() {
  var assertProperDestruction = Mixin.create({
    destroyElement: function() {
      if (this._state === 'inDOM') {
        ok(this.get('element'), this + ' still exists in DOM');
      }
      return this._super();
    }
  });

  var ChildView = View.extend(assertProperDestruction, {
    render: function(buf) {
      // emulate nested template
      this.appendChild(View.createWithMixins(assertProperDestruction, {
        template: function() { return "<div class='inner_element'></div>"; }
      }));
    }
  });

  var view = CollectionView.create({
    content: Ember.A([1]),
    itemViewClass: ChildView
  });


  run(function() {
    view.append();
  });
  equal(jQuery('.inner_element').length, 1, "precond - generates inner element");

  run(function() {
    view.get('content').clear();
  });
  equal(jQuery('.inner_element').length, 0, "elements removed");

  run(function() {
    view.remove();
  });
});

test("should render the emptyView if content array is empty and emptyView is given as string", function() {
  Ember.lookup = {
    App: {
      EmptyView: View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("THIS IS AN EMPTY VIEW");
      }
      })
    }
  };
  view = CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: 'App.EmptyView'
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, "displays empty view");
});

test("should lookup against the container if itemViewClass is given as a string", function() {
  var ItemView = View.extend({
    render: function(buf) {
      buf.push(get(this, 'content'));
    }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = CollectionView.create({
    container: container,
    content: Ember.A([1, 2, 3, 4]),
    itemViewClass: 'item'
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 4);

  function lookupFactory(fullName) {
    equal(fullName, 'view:item');

    return ItemView;
  }
});

test("should lookup only global path against the container if itemViewClass is given as a string", function() {
  var ItemView = View.extend({
    render: function(buf) {
      buf.push(get(this, 'content'));
    }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = CollectionView.create({
    container: container,
    content: Ember.A(['hi']),
    itemViewClass: 'top'
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), 'hi');

  function lookupFactory(fullName) {
    equal(fullName, 'view:top');

    return ItemView;
  }
});

test("should lookup against the container and render the emptyView if emptyView is given as string and content array is empty ", function() {
  var EmptyView = View.extend({
    tagName: 'kbd',
    render: function(buf) {
      buf.push("THIS IS AN EMPTY VIEW");
    }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = CollectionView.create({
    container: container,
    tagName: 'del',
    content: Ember.A(),
    emptyView: 'empty'
  });

  run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, "displays empty view");

  function lookupFactory(fullName) {
    equal(fullName, 'view:empty');

    return EmptyView;
  }
});

test("should lookup from only global path against the container if emptyView is given as string and content array is empty ", function() {
  var EmptyView = View.extend({
    render: function(buf) {
      buf.push("EMPTY");
    }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = CollectionView.create({
    container: container,
    content: Ember.A(),
    emptyView: 'top'
  });

  run(function() {
    view.append();
  });

  equal(view.$().text(), "EMPTY");

  function lookupFactory(fullName) {
    equal(fullName, 'view:top');

    return EmptyView;
  }
});
