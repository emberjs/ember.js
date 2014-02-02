// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals Forms module test ok equals same stop start */

var Form, FormWithChildren, FormWithLabelWidths;

module("Forms - FormView", {
  setup: function() {
    // a basic form view, no children
    Form = SC.FormView.extend({

    });

    // a form with some children
    FormWithChildren = SC.FormView.extend({
      childViews: ('row rowWithLabel rowTestingHumanization rowWithContent ' +
                   'rowWithContentValueKey viewWithContentValueSupport ' +
                   'viewWithContent viewWithContentValueKey plainView').w(),

      // keep things clean: don't use real form rows. Simulate to test
      // interface between FormRow and Form
      row: SC.View.extend({
        isFormRow: YES
      }),

      rowWithLabel: SC.View.extend({
        isFormRow: YES,
        label: "Hi"
      }),

      rowTestingHumanization: SC.View.extend({
        isFormRow: YES
      }),

      rowWithContent: SC.View.extend({
        isFormRow: YES,
        hasContentValueSupport: YES,
        content: SC.Object.create({ original: YES })
      }),

      rowWithContentValueKey: SC.View.extend({
        isFormRow: YES,
        hasContentValueSupport: YES,
        contentValueKey: 'hello'
      }),

      viewWithContentValueSupport: SC.View.extend({
        hasContentValueSupport: YES
      }),

      viewWithContent: SC.View.extend({
        hasContentValueSupport: YES,
        content: SC.Object.create({ original: YES })
      }),

      viewWithContentValueKey: SC.View.extend({
        hasContentValueSupport: YES,
        contentValueKey: 'hello'
      }),

      plainView: SC.View.extend({
      })

    });

    FormWithLabelWidths = SC.FormView.extend({
      childViews: 'view1 view2'.w(),
      view1: SC.View.extend({
        isFormRow: YES,
        hasRowLabel: YES,
        rowLabelMeasuredSize: 50
      }),

      view2: SC.View.extend({
        isFormRow: YES,
        hasRowLabel: YES,
        rowLabelMeasuredSize: 70
      })
    });
  }

});

test("FormView defaults", function() {
  var form = Form.create();

  // just sanity-checking
  equals(form.get('layoutDirection'), SC.LAYOUT_VERTICAL, "Default layout direction");
  equals(form.get('canWrap'), NO, "canWrap should default to NO");
  equals(form.get('editsByDefault'), YES, "Forms should edit by default");

});

test("FormView - editsB'))fault sets isEditing appropriately", function() {
  var formEditsByDefault = Form.create(), formNoEdit = Form.create({ editsByDefault: NO });

  equals(formEditsByDefault.get('isEditing'), YES, "Form with editsByDefault is editing");
  equals(formNoEdit.get('isEditing'), NO, "Form without editsByDefault is not editing");
});

test("FormView - labels set on rows correctly", function() {
  var form = FormWithChildren.create();
  equals(form.childViews[0].get('label'), "Row", "Label set automatically");
  equals(form.childViews[1].get('label'), "Hi", "Label not set automatically if set directly");
  equals(form.childViews[2].get('label'), "Row Testing Humanization", "Humanization is applied");
});

test("FormView - content set on rows correctly", function() {
  var content = SC.Object.create({
    row: "Hi",
    rowWithContent: "Yeah, this is ignored",
    specialKey: "Some Value",
    plainView: "Yo"
  });

  SC.RunLoop.begin();
  var form = FormWithChildren.create({ content: content });
  SC.RunLoop.end();

  equals(form.row.get('content'), content, "Content gets set for normal row");
  equals(form.rowWithContent.getPath('content.original'), YES, "Row with content has original content");
  equals(form.viewWithContentValueSupport.get('content'), content, "Content gets set on view with content value support");
  equals(form.viewWithContent.getPath('content.original'), YES, "Content stays original on row that already has content");
  equals(form.plainView.get('content'), content, "Plain views get content as well");
});

test("FormView - contentValueKey", function() {
  var content = SC.Object.create({
    row: "Hi",
    rowWithContent: "Yeah, this is ignored",
    specialKey: "Some Value",
    plainView: "Yo"
  });

  SC.RunLoop.begin();
  var form = FormWithChildren.create({ content: content });
  SC.RunLoop.end();

  // Form rows don't have contentValue support.
  equals(form.row.get('formKey'), 'row', "Row's formKey is set automatically.");

  // implicit setting of contentValueKey on just any view is a bad idea... so we check that
  // it is NOT set implicitly.
  equals(form.rowWithContent.get('contentValueKey'), undefined, "Row with content value support does not get 'contentValueKey' set");

  // but if it is set directly, that should still work
  equals(form.rowWithContentValueKey.get('contentValueKey'), 'hello', "Row with existing contentValueKey keeps its original one");

  // views with content value support likewise should not get the key set directly;
  // so many views can have contentValueSupport, and that behavior may not be what we want
  equals(form.viewWithContentValueSupport.get('contentValueKey'), undefined, "View with content value support gets left alone");
  equals(form.viewWithContentValueKey.get('contentValueKey'), 'hello', "View with existing contentValueKey keeps original");
  equals(form.plainView.get('contentValueKey'), undefined, "contentValueKey not set on plain view");
  equals(form.plainView.get('formKey'), 'plainView', "formKey is set on plain view");
});

test("FormView - Row label width management", function() {
  SC.RunLoop.begin();
  var form = FormWithLabelWidths.create();
  SC.RunLoop.end();

  equals(form.view1.get('rowLabelSize'), 70, "First row's rowLabelSize is correct");
  equals(form.view2.get('rowLabelSize'), 70, "Second row's rowLabelSize is correct");

  SC.RunLoop.begin();
  form.view2.set('rowLabelMeasuredSize', 30);

  // row view will have to tell parent, but since these are not real row views:
  form.rowLabelMeasuredSizeDidChange(form.view2, 30);

  SC.RunLoop.end();


  equals(form.view1.get('rowLabelSize'), 50, "First row's rowLabelSize is correct");
  equals(form.view2.get('rowLabelSize'), 50, "Second row's rowLabelSize is correct");

  // setting labelWidth directly should make FormView always use that
  form.set('labelWidth', 500);
  equals(form.view1.get('rowLabelSize'), 500, "First row's rowLabelSize is correct");
  equals(form.view2.get('rowLabelSize'), 500, "Second row's rowLabelSize is correct");
});
