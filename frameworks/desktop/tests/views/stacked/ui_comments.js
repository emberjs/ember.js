// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module, test, ok, equals, htmlbody, clearHtmlbody */

/* Test SC.StackedView with a Comments example. */

var CommentView = SC.View.extend(SC.Control, {

  useStaticLayout: YES,

  content: null,

  classNames: 'comment-view',

  contentKeys: {
    'contentFromKey': 'from',
    'contentDateKey': 'date',
    'contentCommentKey': 'comment'
  },

  contentFromKey: 'from',

  contentDateKey: 'date',

  contentCommentKey: 'comment',

  contentPropertyDidChange: function (target, key) {

    // update everything!
    if (key === '*') {
      this.updateFromLabel().updateCommentLabel();
    } else if (key === 'from' || key === 'date') {
      this.updateFromLabel();
    } else if (key === 'comment') {
      this.updateCommentLabel();
    }

    if (this.owner && this.owner.updateHeight) this.owner.updateHeight();
  },

  updateFromLabel: function () {
    var content = this.get('content'),
        from    = content ? content.get('from') : 'Anonymous',
        date    = content ? content.get('date') : 'some date',
        str     = "%@ wrote %@: ".fmt(from, date);
    this.fromLabel.set('value', str);

    return this;
  },

  updateCommentLabel: function () {
    var content = this.get('content'),
        comment = content ? content.get('comment') : '(No Comment)';
    this.commentLabel.set('value', comment);
  },

  // ..........................................................
  // BASE VIEWS
  //

  childViews: 'fromLabel commentLabel editButton replyButton'.w(),

  fromLabel: SC.LabelView.extend({
    tagName: "label",
    layout: { left: 0, top: 0, right: 0, height: 18 }
  }),

  commentLabel: SC.LabelView.extend({
    useStaticLayout: YES,
    tagName: "p"
  }),

  editButton: SC.ButtonView.extend({
    title: "Edit",
    titleMinWidth: 0,
    layout: { bottom: 4, right: 58, height: 21, width: 50 }
  }),

  replyButton: SC.ButtonView.extend({
    title: "Reply",
    titleMinWidth: 0,
    layout: { bottom: 4, right: 4, height: 21, width: 50 }
  })

});

var content = [
  SC.Object.create({
    from: "Joe",
    date: "Today",
    comment: "I think this new class is a great idea!  I've always wanted less control but more flexibility."
  }),
  SC.Object.create({
    from: "Joe",
    date: "Today",
    comment: "I think this new class is a great idea!  I've always wanted less control but more flexibility."
  }),
  SC.Object.create({
    from: "Joe",
    date: "Today",
    comment: "I think this new class is a great idea!  I've always wanted less control but more flexibility."
  }),
  SC.Object.create({
    from: "Joe",
    date: "Today",
    comment: "I think this new class is a great idea!  I've always wanted less control but more flexibility."
  }),
  SC.Object.create({
    from: "Jane",
    date: "Yesterday",
    comment: "If only you would rewrite this in Flash.  Then I could get really excited about it.  I like it when Adobe controls my destiny."
  })
];

var extra = SC.Object.create({
  from: "Charles",
  date: "Tomorrow",
  comment: "Hello from the world of  tomorrow!"
});

var pane = SC.ControlTestPane.design()
  .add("basic", SC.StackedView, {
    layout: { top: 0, left: 0, right: 0 },
    content: content,
    exampleView: CommentView
  });

// ..........................................................
// BASIC TESTS
//
module("Basic Tests", {
  setup: function () {
    htmlbody(["<style>",
      '.sc-stacked-view { border-bottom: 1px red solid; }',
      '.comment-view.sel { background-color: #ccc; }',
      '.comment-view { margin: 0 10px; padding: 10px 0; border-bottom: 1px #ccc solid; }',
      '.comment-view p { padding-top: 28px; padding-bottom: 32px; }',
    '</style>'].join("\n"));
    pane.standardSetup().setup();
  },
  teardown: function () {
    pane.standardSetup().teardown();
    clearHtmlbody();
  }
});

test("removing an item should delete childView and adjust height", function () {
  var view = pane.view('basic'),
      item = content[0];

  equals(view.getPath('childViews.length'), content.length, 'precond - should have child views equal to current content');
  var oldHeight = view.get('frame').height; // save height.

  SC.run(function () { content.removeAt(0); }); // remove first item


  equals(view.getPath('childViews.length'), content.length, 'view should remove childView for removed content items');
  var newHeight = view.get('frame').height;
  ok(newHeight < oldHeight, 'view height should adjust to reflect new content. (old height: %@ current height: %@)'.fmt(oldHeight, newHeight));

  // restore old content
  SC.run(function () { content.insertAt(0, item); });

});

window.content = content;

test("inserting an item should add childView and adjust height", function () {
  var view = pane.view('basic'),
      item = extra; // we will insert another one

  equals(view.getPath('childViews.length'), content.length, 'precond - should have child views equal to current content');
  var oldHeight = view.get('frame').height; // save height.

  SC.run(function () { content.pushObject(item); }); // add another item


  equals(view.getPath('childViews.length'), content.length, 'view should add childView for added content item');
  var newHeight = view.get('frame').height;
  ok(newHeight > oldHeight, 'view height should adjust to reflect new content. (old height: %@ current height: %@)'.fmt(oldHeight, newHeight));

  // restore
  SC.run(function () { content.popObject(); });
});


test("editing an item should automatically adjust the height", function () {
  var view = pane.view('basic'),
      item = content[0],
      childView = view.childViews[0],
      old = item.get('comment');

  ok(childView, 'stacked view should have child view');
  equals(childView.get('content'), item, 'first childView should own first content item');

  var height = view.get('frame').height;  // save old height

  // change comment
  SC.run(function () { item.set('comment', 'This is a new comment'); });

  // should have updated UI and adjusted height of collection
  equals(childView.$().find('p').text(), 'This is a new comment', 'Item view should now contain comment');

  var newHeight = view.get('frame').height;
  ok(newHeight < height, 'view height should adjust to reflect new content. (old height: %@ current height: %@)'.fmt(height, newHeight));

  // restore
  SC.run(function () { item.set('comment', old); });

  newHeight = view.get('frame').height;
  equals(newHeight, height, 'view height should restore to old height when content is edited again. (old height: %@ current height: %@)'.fmt(height, newHeight));

});

// ..........................................................
// SPECIAL CASES
//

// tests specific bug where a series of many edits strung together would
// cause the height to get out of sync.
test("adding, removing then editing items should still keep height the same", function () {

  var view = pane.view('basic'),
      item = content[0],
      old  = item.get('comment'),
      height = view.get('frame').height; // save old height

  SC.run(function () { content.removeAt(0); });
  SC.run(function () { content.insertAt(0, item); });
  SC.run(function () { content.pushObject(extra); });
  SC.run(function () { content.popObject(); });

  SC.run(function () { item.set('comment', 'Short comment'); });
  SC.run(function () { item.set('comment', old); });

  var newHeight = view.get('frame').height;
  equals(newHeight, height, 'view height should restore to old height when content is edited again. (old height: %@ current height: %@)'.fmt(height, newHeight));

});






