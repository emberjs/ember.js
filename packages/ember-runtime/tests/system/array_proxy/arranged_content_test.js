var array;

module("Ember.ArrayProxy - arrangedContent", {
  setup: function() {
    Ember.run(function() {
      array = Ember.ArrayProxy.createWithMixins({
        content: Ember.A([1,2,4,5]),
        arrangedContent: Ember.computed(function() {
          var content = this.get('content');
          return content && Ember.A(content.slice().sort(function(a,b) {
            if (a == null) { a = -1; }
            if (b == null) { b = -1; }
            return b - a;
          }));
        }).property('content.[]')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      array.destroy();
    });
  }
});

test("addObject - adds to end of 'content' if not present", function() {
  Ember.run(function() { array.addObject(3); });
  deepEqual(array.get('content'), [1,2,4,5,3], 'adds to end of content');
  deepEqual(array.get('arrangedContent'), [5,4,3,2,1], 'arrangedContent stays sorted');

  Ember.run(function() { array.addObject(1); });
  deepEqual(array.get('content'), [1,2,4,5,3], 'does not add existing number to content');
});

test("addObjects - adds to end of 'content' if not present", function() {
  Ember.run(function() { array.addObjects([1,3,6]); });
  deepEqual(array.get('content'), [1,2,4,5,3,6], 'adds to end of content');
  deepEqual(array.get('arrangedContent'), [6,5,4,3,2,1], 'arrangedContent stays sorted');
});

test("compact - returns arrangedContent without nulls and undefined", function() {
  Ember.run(function() { array.set('content', Ember.A([1,3,null,2,undefined])); });
  deepEqual(array.compact(), [3,2,1]);
});

test("indexOf - returns index of object in arrangedContent", function() {
  equal(array.indexOf(4), 1, 'returns arranged index');
});

test("insertAt - raises, indeterminate behavior", function() {
  raises(function() {
    Ember.run(function() { array.insertAt(2,3); });
  });
});

test("lastIndexOf - returns last index of object in arrangedContent", function() {
  Ember.run(function() { array.pushObject(4); });
  equal(array.lastIndexOf(4), 2, 'returns last arranged index');
});

test("nextObject - returns object at index in arrangedContent", function() {
  equal(array.nextObject(1), 4, 'returns object at index');
});

test("objectAt - returns object at index in arrangedContent", function() {
  equal(array.objectAt(1), 4, 'returns object at index');
});

// Not sure if we need a specific test for it, since it's internal
test("objectAtContent - returns object at index in arrangedContent", function() {
  equal(array.objectAtContent(1), 4, 'returns object at index');
});

test("objectsAt - returns objects at indices in arrangedContent", function() {
  deepEqual(array.objectsAt([0,2,4]), [5,2,undefined], 'returns objects at indices');
});

test("popObject - removes last object in arrangedContent", function() {
  var popped;
  Ember.run(function() { popped = array.popObject(); });
  equal(popped, 1, 'returns last object');
  deepEqual(array.get('content'), [2,4,5], 'removes from content');
});

test("pushObject - adds to end of content even if it already exists", function() {
  Ember.run(function() { array.pushObject(1); });
  deepEqual(array.get('content'), [1,2,4,5,1], 'adds to end of content');
});

test("pushObjects - adds multiple to end of content even if it already exists", function() {
  Ember.run(function() { array.pushObjects([1,2,4]); });
  deepEqual(array.get('content'), [1,2,4,5,1,2,4], 'adds to end of content');
});

test("removeAt - removes from index in arrangedContent", function() {
  Ember.run(function() { array.removeAt(1,2); });
  deepEqual(array.get('content'), [1,5]);
});

test("removeObject - removes object from content", function() {
  Ember.run(function() { array.removeObject(2); });
  deepEqual(array.get('content'), [1,4,5]);
});

test("removeObjects - removes objects from content", function() {
  Ember.run(function() { array.removeObjects([2,4,6]); });
  deepEqual(array.get('content'), [1,5]);
});

test("replace - raises, indeterminate behavior", function() {
  raises(function() {
    Ember.run(function() { array.replace(1, 2, [3]); });
  });
});

test("replaceContent - does a standard array replace on content", function() {
  Ember.run(function() { array.replaceContent(1, 2, [3]); });
  deepEqual(array.get('content'), [1,3,5]);
});

test("reverseObjects - raises, use Sortable#sortAscending", function() {
  raises(function() {
    Ember.run(function() { array.reverseObjects(); });
  });
});

test("setObjects - replaces entire content", function() {
  Ember.run(function() { array.setObjects([6,7,8]); });
  deepEqual(array.get('content'), [6,7,8], 'replaces content');
});

test("shiftObject - removes from start of arrangedContent", function() {
  var shifted;
  Ember.run(function() { shifted = array.shiftObject(); });
  equal(shifted, 5, 'returns first object');
  deepEqual(array.get('content'), [1,2,4], 'removes object from content');
});

test("slice - returns a slice of the arrangedContent", function() {
  deepEqual(array.slice(1,3), [4,2], 'returns sliced arrangedContent');
});

test("toArray - returns copy of arrangedContent", function() {
  deepEqual(array.toArray(), [5,4,2,1]);
});

test("unshiftObject - adds to start of content", function() {
  Ember.run(function(){ array.unshiftObject(6); });
  deepEqual(array.get('content'), [6,1,2,4,5], 'adds to start of content');
});

test("unshiftObjects - adds to start of content", function() {
  Ember.run(function(){ array.unshiftObjects([6,7]); });
  deepEqual(array.get('content'), [6,7,1,2,4,5], 'adds to start of content');
});

test("without - returns arrangedContent without object", function() {
  deepEqual(array.without(2), [5,4,1], 'returns arranged without object');
});

test("lastObject - returns last arranged object", function() {
  equal(array.get('lastObject'), 1, 'returns last arranged object');
});

test("firstObject - returns first arranged object", function() {
  equal(array.get('firstObject'), 5, 'returns first arranged object');
});


module("Ember.ArrayProxy - arrangedContent matching content", {
  setup: function() {
    Ember.run(function() {
      array = Ember.ArrayProxy.createWithMixins({
        content: Ember.A([1,2,4,5])
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      array.destroy();
    });
  }
});

test("insertAt - inserts object at specified index", function() {
  Ember.run(function() { array.insertAt(2, 3); });
  deepEqual(array.get('content'), [1,2,3,4,5]);
});

test("replace - does a standard array replace", function() {
  Ember.run(function() { array.replace(1, 2, [3]); });
  deepEqual(array.get('content'), [1,3,5]);
});

test("reverseObjects - reverses content", function() {
  Ember.run(function() { array.reverseObjects(); });
  deepEqual(array.get('content'), [5,4,2,1]);
});

module("Ember.ArrayProxy - arrangedContent with transforms", {
  setup: function() {
    Ember.run(function() {
      array = Ember.ArrayProxy.createWithMixins({
        content: Ember.A([1,2,4,5]),

        arrangedContent: Ember.computed(function() {
          var content = this.get('content');
          return content && Ember.A(content.slice().sort(function(a,b) {
            if (a == null) { a = -1; }
            if (b == null) { b = -1; }
            return b - a;
          }));
        }).property('content.[]'),

        objectAtContent: function(idx) {
          var obj = this.get('arrangedContent').objectAt(idx);
          return obj && obj.toString();
        }
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      array.destroy();
    });
  }
});

test("indexOf - returns index of object in arrangedContent", function() {
  equal(array.indexOf('4'), 1, 'returns arranged index');
});

test("lastIndexOf - returns last index of object in arrangedContent", function() {
  Ember.run(function() { array.pushObject(4); });
  equal(array.lastIndexOf('4'), 2, 'returns last arranged index');
});

test("nextObject - returns object at index in arrangedContent", function() {
  equal(array.nextObject(1), '4', 'returns object at index');
});

test("objectAt - returns object at index in arrangedContent", function() {
  equal(array.objectAt(1), '4', 'returns object at index');
});

// Not sure if we need a specific test for it, since it's internal
test("objectAtContent - returns object at index in arrangedContent", function() {
  equal(array.objectAtContent(1), '4', 'returns object at index');
});

test("objectsAt - returns objects at indices in arrangedContent", function() {
  deepEqual(array.objectsAt([0,2,4]), ['5','2',undefined], 'returns objects at indices');
});

test("popObject - removes last object in arrangedContent", function() {
  var popped;
  Ember.run(function() { popped = array.popObject(); });
  equal(popped, '1', 'returns last object');
  deepEqual(array.get('content'), [2,4,5], 'removes from content');
});

test("removeObject - removes object from content", function() {
  Ember.run(function() { array.removeObject('2'); });
  deepEqual(array.get('content'), [1,4,5]);
});

test("removeObjects - removes objects from content", function() {
  Ember.run(function() { array.removeObjects(['2','4','6']); });
  deepEqual(array.get('content'), [1,5]);
});

test("shiftObject - removes from start of arrangedContent", function() {
  var shifted;
  Ember.run(function() { shifted = array.shiftObject(); });
  equal(shifted, '5', 'returns first object');
  deepEqual(array.get('content'), [1,2,4], 'removes object from content');
});

test("slice - returns a slice of the arrangedContent", function() {
  deepEqual(array.slice(1,3), ['4','2'], 'returns sliced arrangedContent');
});

test("toArray - returns copy of arrangedContent", function() {
  deepEqual(array.toArray(), ['5','4','2','1']);
});

test("without - returns arrangedContent without object", function() {
  deepEqual(array.without('2'), ['5','4','1'], 'returns arranged without object');
});

test("lastObject - returns last arranged object", function() {
  equal(array.get('lastObject'), '1', 'returns last arranged object');
});

test("firstObject - returns first arranged object", function() {
  equal(array.get('firstObject'), '5', 'returns first arranged object');
});
