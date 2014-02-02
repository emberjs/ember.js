// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2009 Alex Iskander and TPSi
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("mixins/emptiness");
sc_require("mixins/edit_mode");

/*globals Forms */

/** @class
  Represents a single row in a form. Rows have label and any number of other child views.


  @extends SC.View
  @author Alex Iskander
*/
SC.FormRowView = SC.View.extend(SC.FlowedLayout, SC.CalculatesEmptiness, SC.FormsEditMode,
/** @scope Forms.FormRowView.prototype */ {
  classNames: ["sc-form-row-view"],
  renderDelegateName: 'formRowRenderDelegate',

  flowPadding: SC.propertyFromRenderDelegate('flowPadding'),
  defaultFlowSpacing: SC.propertyFromRenderDelegate('flowSpacing'),

  fillWidth: YES,
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  layout: {left: 0, width: 0, height: 0},

  /**
    Walks like a duck.
  */
  isFormRow: YES,

  /**
    A value set so that FormView knows to tell us about the row label size change.
  */
  hasRowLabel: YES,


  /**
    The text to display next to the row. If undefined, SproutCore will try
    to set it automatically to the key corresponding to this row in the FormView.
  */
  label: undefined,

  /**
    The actual size for the label, as assigned by the parent FormView.
  */
  rowLabelSize: 0,

  /**
    The measured size of the label. The parent FormView may use this to
    determine the proper rowLabelSize.
  */
  rowLabelMeasuredSize: 0,

  /**
    If NO, the label will not automatically measure itself. The parent
    FormView normally manages this property for FormRowView.

    Note that FormRowView never changes its own rowLabelSize: it only
    measures it. The measurement is placed into rowLabelMeasuredSize.

    The FormView then sets the rowLabelSize, which is used to set the
    width of the LabelView.
  */
  shouldMeasureLabel: YES,

  /**
    The label view. The default is an SC.FormRowView.LabelView, which is
    configured to handle resizing.
  */
  labelView: null, // NOTE: gets set at end of file.

  /**
    Updates keys, content, etc. on fields. Also, handles our "special" field (only-one case)
  */
  createChildViews: function() {
    // keep array of keys so we can pass on key to child.
    var cv = SC.clone(this.get('childViews'));

    // add label
    if (this.labelView.isClass) {
      this.labelView = this.createChildView(this.labelView, {
        value: this.get('label')
      });

      this.labelView.addObserver('measuredSize', this, 'labelSizeDidChange');
      this.labelView.bind('shouldMeasureSize', this, 'shouldMeasureLabel');
      this.get('childViews').unshift(this.labelView);
    }

    var content = this.get('content');

    sc_super();


    // now, do the actual passing it
    var idx, len = cv.length, key, v;
    for (idx = 0; idx < len; idx++) {
      key = cv[idx];

      // if the view was originally declared as a string, then we have something to give it
      if (SC.typeOf(key) === SC.T_STRING) {
        // try to get the actual view
        v = this.get(key);

        // see if it does indeed exist, and if it doesn't have a value already
        if (v && !v.isClass) {
          if (!v.get('contentValueKey')) {
            //
            // NOTE: WE HAVE A SPECIAL CASE
            //       If this is the single field, pass through our formKey
            //       Single-field rows are created by the SC.FormView.row helper.
            if (key === "_singleField")  {
              v.set('contentValueKey', this.get('formKey'));
            } else {
              v.set('contentValueKey', key);
            }
          }

          if (!v.get('content')) {
            v.bind('content', this, 'content') ;
          }
        }

      }
    }

    this.rowLabelSizeDidChange();
  },

  labelDidChange: function() {
    this.get("labelView").set("value", this.get("label"));
  }.observes("label"),

  labelSizeDidChange: function() {
    var size = this.get("labelView").get("measuredSize");
    this.set("rowLabelMeasuredSize", size.width);

    // alert parent view if it is a row delegate
    var pv = this.get("parentView");
    if (pv && pv.get("isRowDelegate")) pv.rowLabelMeasuredSizeDidChange(this, size);
  },

  rowLabelSizeDidChange: function() {
    this.get("labelView").adjust({
      "width": this.get("rowLabelSize")
    });
  }.observes("rowLabelSize")

});

SC.FormRowView.mixin({
  row: function(label, fieldType, ext) {
    if (label.isClass) {
      ext = fieldType;
      fieldType = label;
      label = null;
    }
    // now, create a hash (will be used by the parent form's exampleRow)
    if (!ext) {
      ext = {};
    } else {
      ext = SC.clone(ext);
    }
    ext.label = label;
    ext.childViews = ["_singleField"];
    ext._singleField = fieldType;
    return ext;
  },

  LabelView: SC.LabelView.extend(SC.AutoResize, SC.CalculatesEmptiness, {
    shouldAutoResize: NO, // only change the measuredSize so we can update.
    layout: { left:0, top:0, width: 0, height: 18 },
    fillHeight: YES,
    classNames: ["sc-form-label"],
    isValue: NO
  })
});

SC.FormRowView.prototype.labelView = SC.FormRowView.LabelView.design();
