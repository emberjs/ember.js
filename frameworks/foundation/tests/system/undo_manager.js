// ==========================================================================
// SC.UndoManager Unit Test
// ==========================================================================
/*globals SC */

module("SC.UndoManager");

test("simple undo case", function () {
  var undoManager = SC.UndoManager.create(),
    obj = SC.Object.create({
      undoManager: undoManager,

      value: null,

      actionName: 0,

      _undoAction: function(value) {
        this.set('value', value);
      },

      valDidChange: function() {
        var that = this,
          value = this._value;

        undoManager.registerUndoAction(this, this._undoAction, value, this.actionName);

        this._value = this.get('value');
      }.observes('value')
    });

  obj.actionName = 'group1';
  obj.set('value', 'a');
  ok(undoManager.get('canUndo'), "We should be able to undo");
  equals(undoManager.get('undoActionName'), 'group1', "The name of the undo stack should be 'group1'");

  obj.actionName = 'group2';
  obj.set('value', 'ab');

  obj.actionName = 'group3';
  obj.set('value', 'abc');
  equals(undoManager.get('undoActionName'), 'group3', "The name of the undo stack should be 'group3'");

  undoManager.undo();
  equals(obj.get('value'), 'ab', "val should be 'ab'");
  ok(undoManager.get('canRedo'), "We should be able to redo");
  equals(undoManager.get('undoActionName'), 'group2', "The name of the undo stack should be 'group2'");
  equals(undoManager.get('redoActionName'), 'group3', "The name of the redo stack should be 'group3'");

  undoManager.undo();
  equals(obj.get('value'), 'a', "val should be 'a'");
  equals(undoManager.get('undoActionName'), 'group1', "The name of the undo stack should be 'group1'");
  equals(undoManager.get('redoActionName'), 'group2', "The name of the redo stack should be 'group2'");

  undoManager.redo();
  equals(obj.get('value'), 'ab', "val should be 'ab'");
  equals(undoManager.get('undoActionName'), 'group2', "The name of the undo stack should be 'group2'");
  equals(undoManager.get('redoActionName'), 'group3', "The name of the redo stack should be 'group3'");

  undoManager.undo();
  equals(obj.get('value'), 'a', "val should be 'a'");

  undoManager.undo();
  equals(obj.get('value'), null, "val should be 'null'");
  ok(!undoManager.get('canUndo'), "We shouldn't be able to undo");
  equals(undoManager.get('undoActionName'), null, "The name of the undo stack should be 'null'");

  undoManager.redo();
  equals(obj.get('value'), 'a', "val should be 'a'");

  undoManager.redo();
  equals(obj.get('value'), 'ab', "val should be 'ab'");

  undoManager.redo();
  equals(obj.get('value'), 'abc', "val should be 'abc'");
  ok(!undoManager.get('canRedo'), "We shouldn't be able to redo");

  undoManager.undo();
  undoManager.undo();
  equals(obj.get('value'), 'a', "val should be 'a'");

  obj.set('value', 'ad');
  ok(!undoManager.get('canRedo'), "We shouldn't be able to redo");

  undoManager.undo();
  ok(undoManager.get('canUndo'), "We should be able to undo");
  ok(undoManager.get('canRedo'), "We should be able to redo");

  undoManager.reset();

  ok(!undoManager.get('canUndo'), "We shouldn't be able to undo");
  ok(!undoManager.get('canRedo'), "We shouldn't be able to redo");
});


test("grouped undo case", function () {
  var undoManager = SC.UndoManager.create(),
    obj = SC.Object.create({
      undoManager: undoManager,

      value: null,

      actionName: 0,

      _undoAction: function(value) {
        this.set('value', value)
      },

      valDidChange: function() {
        var value = this._value,
            actionName = this.actionName;

        if (actionName === this._actionName) {
          undoManager.registerGroupedUndoAction(this, this._undoAction, value);
        }
        else {
          undoManager.registerUndoAction(this, this._undoAction, value, actionName);
        }

        this._value = this.get('value');
        this._actionName = actionName;
      }.observes('value')
    });

  obj.actionName = 'group1';
  obj.set('value', 'a');
  ok(undoManager.get('canUndo'), "We should be able to undo");
  equals(undoManager.get('undoActionName'), 'group1', "The name of the undo stack should be 'group1'");

  obj.actionName = 'group2';
  obj.set('value', 'ab');
  obj.set('value', 'abc');
  equals(undoManager.get('undoActionName'), 'group2', "The name of the undo stack should be 'group2'");

  obj.actionName = 'group3';
  obj.set('value', 'abcd');

  undoManager.undo();
  equals(obj.get('value'), 'abc', "val should be 'abc'");
  ok(undoManager.get('canRedo'), "We should be able to redo");
  equals(undoManager.get('undoActionName'), 'group2', "The name of the undo stack should be 'group2'");
  equals(undoManager.get('redoActionName'), 'group3', "The name of the redo stack should be 'group3'");

  undoManager.undo();
  equals(obj.get('value'), 'a', "val should be 'a'");

  undoManager.redo();
  equals(obj.get('value'), 'abc', "val should be 'abc'");

  undoManager.undo();
  equals(obj.get('value'), 'a', "val should be 'a'");

  undoManager.undo();
  equals(obj.get('value'), null, "val should be 'null'");
  ok(!undoManager.get('canUndo'), "We shouldn't be able to undo");

  undoManager.redo();
  equals(obj.get('value'), 'a', "val should be 'a'");

  undoManager.redo();
  equals(obj.get('value'), 'abc', "val should be 'abc'");

  undoManager.redo();
  equals(obj.get('value'), 'abcd', "val should be 'abcd'");
  ok(!undoManager.get('canRedo'), "We shouldn't be able to redo");

  undoManager.redo();
});

test("set action name", function () {
  var undoManager = SC.UndoManager.create();

  undoManager.setActionName('group1');
  undoManager.registerUndoAction();

  equals(undoManager.get('undoActionName'), null, "The name of the undo stack should be null");

  undoManager.setActionName('group1');

  equals(undoManager.get('undoActionName'), 'group1', "The name of the undo stack should be 'group1'");
});

test("restrict number of groups", function () {
  var undoManager = SC.UndoManager.create({
      maxStackLength: 2
    }),
    obj = SC.Object.create({
      undoManager: undoManager,
      value: 0,
      _undoAction: function(value) {
        this.set('value', value);
      },
      valDidChange: function() {
        var value = this.get('value') - 1;
        undoManager.registerUndoAction(this, this._undoAction, value);
      }.observes('value')
    }),
    computeStackLength = function(stack) {
      var length = 1;
      while(stack = stack.prev) {
        length++;
      }
      return length;
    },
    length;

  obj.incrementProperty('value');
  obj.incrementProperty('value');
  obj.incrementProperty('value');
  obj.incrementProperty('value');
  obj.incrementProperty('value');

  equals(obj.get('value'), 5, "value should be 5");

  length = computeStackLength(undoManager.undoStack);
  equals(length, 3, "The undo stack length should be 3");

  undoManager.endUndoGroup();

  length = computeStackLength(undoManager.undoStack);
  equals(length, 2, "The undo stack length should be 2");

  undoManager.undo();
  undoManager.undo();

  ok(!undoManager.get('canUndo'), "We shouldn't be able to undo");

  length = computeStackLength(undoManager.redoStack);
  equals(length, 2, "The redo stack length should be 2");
});


