sc_require("views/view");

SC.View.reopen(
  /** @scope SC.View.prototype */ {

  /**
    You can set this to an SC.Cursor instance; whenever that SC.Cursor's
    'cursorStyle' changes, the cursor for this view will automatically
    be updated to match. This allows you to coordinate the cursors of
    many views by making them all share the same cursor instance.

    For example, SC.SplitView uses this ensure that it and all of its
    children have the same cursor while dragging, so that whether you are
    hovering over the divider or another child of the split view, the
    proper cursor is visible.

    @property {SC.Cursor String}
  */
  cursor: function(key, value) {
    var parent;

    if (value) { this._setCursor = value; }
    if (this._setCursor !== undefined) { return this._setCursor; }

    parent = this.get('parentView');
    if (this.get('shouldInheritCursor') && parent) {
      return parent.get('cursor');
    }

    return null;
  }.property('parentView', 'shouldInheritCursor').cacheable(),

  applyAttributesToContext: function(original, context) {
    var cursor = this.get('cursor');
    if (cursor) { context.addClass(cursor.get('className')); }

    original(context);
  }.enhance(),

  /**
    A child view without a cursor of its own inherits its parent's cursor by
    default.  Set this to NO to prevent this behavior.

    @type Boolean
  */
  shouldInheritCursor: YES

});
