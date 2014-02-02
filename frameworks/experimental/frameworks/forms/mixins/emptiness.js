// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace 
  A view is empty if all of its children are empty. A view is automatically 
  counted as empty if it is not visible, and not empty if it is being edited.

  Any field that does not mix in CalculatesEmptiness will be considered empty.
*/
SC.CalculatesEmptiness = {
  
  hasCalculatesEmptiness: YES,
  
  /**
  YES if the value of the field is empty. Defaults to yes so if you don't override this, it will only consider child fields in emptiness calculation (this is the desired behavior for forms).
  */
  isValueEmpty: YES,
  
  /**
    Defaults to YES so that a field with no children will act properly.
  */
  _scce_childrenAreEmpty: YES,
  
  /**
    If YES, all visible fields are considered non-empty when editing.
    @type Boolean
    @default YES
  */
  isEditingAffectsIsEmpty: YES,


  _scce_isEditingDidChange: function() {
    if(this.get('isEditingAffectsIsEmpty')) {
      this.notifyPropertyChange('isEmpty');
    }
  }.observes('isEditing'),
  
  /**
    YES if the field itself is empty. Even if the value is non-empty, the field can be empty due to isVisible.
  */
  isEmpty: function() {
    // When not visible, it is empty. Period.
    if (!this.get('isVisible')) {
      return YES;
    }

    // if it is editing and edit mode affects emptiness, it is NOT empty.
    if (this.get('isEditingAffectsIsEmpty') && this.get('isEditing')) {
      return NO;
    }

    // otherwise, it is empty if its value AND all children are empty.
    return this.get('isValueEmpty') && this.get('_scce_childrenAreEmpty');
  }.property('isValueEmpty', 'isVisible', '_scce_childrenAreEmpty', 'isEditingAffectsIsEmpty').cacheable(),

  /**
    When emptiness changes tell the parent to re-check its own emptiness.
  */
  _scce_isEmptyDidChange: function() {
    var parentView = this.get('parentView');

    if (parentView && parentView._scce_emptinessDidChangeFor) {
      parentView._scce_emptinessDidChangeFor(this);
    }
  }.observes('isEmpty'),

  initMixin: function() {
    this._scce_emptinessDidChangeFor();
  },

  /**
  Called by fields when their emptiness changes.

  Always triggers (at end of run loop) a relayout of fields.
  */
  _scce_emptinessDidChangeFor: function(child) {
    this.invokeOnce('_scce_recalculateChildrensEmptiness');
  },

  /**
  By default, a view will check all of its fields to determine if it is empty. It is only empty if all of its value fields are.
  */
  _scce_recalculateChildrensEmptiness: function()
  {
    // in short, we get the value fields, if we come across one that is not empty
    // we cannot be empty.
    var views = this.get('childViews');

    var empty = YES,
    len = views.length,
    field;

    for (var i = 0; i < len; i++)
    {
      field = views[i];

      if (!field.get('isEmpty') && field.hasCalculatesEmptiness) {
        empty = NO;
        break;
      }
    }
    
    this.setIfChanged('_scce_childrenAreEmpty', empty);
  }
};

