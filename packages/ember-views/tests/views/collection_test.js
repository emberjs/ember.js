var set = Ember.set, get = Ember.get;
var forEach = Ember.EnumerableUtils.forEach;
var view;

module("Ember.CollectionView", {
  setup: function() {
    Ember.CollectionView.CONTAINER_MAP.del = 'em';
  },
  teardown: function() {
    delete Ember.CollectionView.CONTAINER_MAP.del;
    Ember.run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("should render a view for each item in its content array", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3, 4])
  });

  Ember.run(function() {
    view.append();
  });
  equal(view.$('div').length, 4);
});

test("should render the emptyView if content array is empty (view class)", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should render the emptyView if content array is empty (view instance)", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: Ember.View.create({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should be able to override the tag name of itemViewClass even if tag is in default mapping", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(['NEWS GUVNAH']),

    itemViewClass: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("NEWS GUVNAH")').length, "displays the item view with proper tag name");
});

test("should allow custom item views by setting itemViewClass", function() {
  var passedContents = [];
  view = Ember.CollectionView.create({
    content: Ember.A(['foo', 'bar', 'baz']),

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        passedContents.push(get(this, 'content'));
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  deepEqual(passedContents, ['foo', 'bar', 'baz'], "sets the content property on each item view");

  forEach(passedContents, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1);
  });
});

test("should insert a new item in DOM when an item is added to the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.insertAt(1, 'quux');
  });

  equal(Ember.$.trim(view.$(':nth-child(2)').text()), 'quux');
});

test("should remove an item from DOM when an item is removed from the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.removeAt(1);
  });

  forEach(content, function(item, idx) {
    equal(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text(), item);
  });
});

test("it updates the view if an item is replaced", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("can add and replace in the same runloop", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(0);
    content.insertAt(0, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });

});

test("can add and replace the object before the add in the same runloop", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("can add and replace complicatedly", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
    content.pushObject("Firestone" );
    content.pushObject("McMunch" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update: "+item.name+"!="+view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text());
  });
});

test("can add and replace complicatedly harder", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
    content.pushObject("Firestone" );
    content.pushObject("McMunch" );
    content.removeAt(2);
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("should allow changes to content object before layer is created", function() {
  view = Ember.CollectionView.create({
    content: null
  });


  Ember.run(function() {
    set(view, 'content', Ember.A());
    set(view, 'content', Ember.A([1, 2, 3]));
    set(view, 'content', Ember.A([1, 2]));
    view.append();
  });

  ok(view.$().children().length);
});

test("should fire life cycle events when elements are added and removed", function() {
  var view,
    didInsertElement = 0,
    willDestroyElement = 0,
    willDestroy = 0,
    destroy = 0,
    content = Ember.A([1, 2, 3]);
  Ember.run(function () {
    view = Ember.CollectionView.create({
      content: content,
      itemViewClass: Ember.View.extend({
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

  Ember.run(function () {
    content.pushObject(4);
    content.unshiftObject(0);
  });


  equal(didInsertElement, 5);
  equal(willDestroyElement, 0);
  equal(willDestroy, 0);
  equal(destroy, 0);
  // Remove whitspace added by IE 8
  equal(view.$().text().replace(/\s+/g,''), '01234');

  Ember.run(function () {
    content.popObject();
    content.shiftObject();
  });

  equal(didInsertElement, 5);
  equal(willDestroyElement, 2);
  equal(willDestroy, 2);
  equal(destroy, 2);
  // Remove whitspace added by IE 8
  equal(view.$().text().replace(/\s+/g,''), '123');

  Ember.run(function () {
    view.set('content', Ember.A([7,8,9]));
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 5);
  equal(willDestroy, 5);
  equal(destroy, 5);
  // Remove whitspace added by IE 8
  equal(view.$().text().replace(/\s+/g,''), '789');

  Ember.run(function () {
    view.destroy();
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 8);
  equal(willDestroy, 8);
  equal(destroy, 8);
});

test("should allow changing content property to be null", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),

    emptyView: Ember.View.extend({
      template: function() { return "(empty)"; }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equal(view.$().children().length, 3, "precond - creates three elements");

  Ember.run(function() {
    set(view, 'content', null);
  });

  equal(Ember.$.trim(view.$().children().text()), "(empty)", "should display empty view");
});

test("should allow items to access to the CollectionView's current index in the content array", function() {
  view = Ember.CollectionView.create({
    content: Ember.A(['zero', 'one', 'two']),
    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'contentIndex'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  deepEqual(view.$(':nth-child(1)').text(), "0");
  deepEqual(view.$(':nth-child(2)').text(), "1");
  deepEqual(view.$(':nth-child(3)').text(), "2");
});

test("should allow declaration of itemViewClass as a string", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),
    itemViewClass: 'Ember.View'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 3);
});

test("should not render the emptyView if content is emptied and refilled in the same run loop", function() {
  view = Ember.CollectionView.create({
    tagName: 'div',
    content: Ember.A(['NEWS GUVNAH']),

    emptyView: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equal(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 0);

  Ember.run(function() {
    view.get('content').popObject();
    view.get('content').pushObject(['NEWS GUVNAH']);
  });
  equal(view.$('div').length, 1);
  equal(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 0);
});

test("a array_proxy that backs an sorted array_controller that backs a collection view functions properly", function() {

  var array = Ember.A([{ name: "Other Katz" }]);
  var arrayProxy = Ember.ArrayProxy.create({content: array});

  var sortedController = Ember.ArrayController.create({
    content: arrayProxy,
    sortProperties: ['name']
  });

  var container = Ember.CollectionView.create({
    content: sortedController
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    arrayProxy.addObjects([{ name: "Scumbag Demon" }, { name: "Lord British" }]);
  });

  equal(container.get('content.length'), 3, 'ArrayController should have 3 entries');
  equal(container.get('content.content.length'), 3, 'RecordArray should have 3 entries');
  equal(container.get('childViews.length'), 3, 'CollectionView should have 3 entries');

  Ember.run(function() {
    container.destroy();
  });
});

test("when a collection view is emptied, deeply nested views elements are not removed from the DOM and then destroyed again", function() {
  var assertProperDestruction = Ember.Mixin.create({
    destroyElement: function() {
      if (this.state === 'inDOM') {
        ok(this.get('element'), this + ' still exists in DOM');
      }
      return this._super();
    }
  });

  var ChildView = Ember.View.extend(assertProperDestruction, {
    render: function(buf) {
      // emulate nested template
      this.appendChild(Ember.View.createWithMixins(assertProperDestruction, {
        template: function() { return "<div class='inner_element'></div>"; }
      }));
    }
  });

  var view = Ember.CollectionView.create({
    content: Ember.A([1]),
    itemViewClass: ChildView
  });


  Ember.run(function() {
    view.append();
  });
  equal(Ember.$('.inner_element').length, 1, "precond - generates inner element");

  Ember.run(function() {
    view.get('content').clear();
  });
  equal(Ember.$('.inner_element').length, 0, "elements removed");

  Ember.run(function() {
    view.remove();
  });
});

test("should render the emptyView if content array is empty and emptyView is given as string", function() {
  Ember.lookup = {
    App: {
      EmptyView: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("THIS IS AN EMPTY VIEW");
      }
      })
    }
  };
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: 'App.EmptyView'
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, "displays empty view");
});

test("should lookup against the container if itemViewClass is given as a string", function() {

  var ItemView = Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = Ember.CollectionView.create({
    container: container,
    content: Ember.A([1, 2, 3, 4]),
    itemViewClass: 'item'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 4);

  function lookupFactory(fullName) {
    equal(fullName, 'view:item');

    return ItemView;
  }
});

test("should lookup against the container and render the emptyView if emptyView is given as string and content array is empty ", function() {
  var EmptyView = Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("THIS IS AN EMPTY VIEW");
      }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view =  Ember.CollectionView.create({
    container: container,
    tagName: 'del',
    content: Ember.A(),

    emptyView: 'empty'
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, "displays empty view");

  function lookupFactory(fullName) {
    equal(fullName, 'view:empty');

    return EmptyView;
  }
});
