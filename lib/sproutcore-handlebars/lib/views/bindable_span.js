// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require('sproutcore-views/views/view');

/**
  @ignore
  @private
  @class

  SC._BindableSpanView is a private view created by the Handlebars `{{bind}}` helpers
  that is used to keep track of bound properties.

  Every time a property is bound using a `{{mustache}}`, an anonymous subclass of
  SC._BindableSpanView is created with the appropriate sub-template and context
  set up. When the associated property changes, just the template for this view
  will re-render.
*/
SC._BindableSpanView = SC.View.extend(
/** @scope SC._BindableSpanView.prototype */{

  /**
   The type of HTML tag to use. To ensure compatibility with
   Internet Explorer 7, a `<span>` tag is used to ensure that inline elements are
   not rendered with display: block.

   @type String
   @default 'span'
  */
  tagName: 'span',

  /**
    The function used to determine if the `displayTemplate` or
    `inverseTemplate` should be rendered. This should be a function that takes
    a value and returns a Boolean.

    @type Function
    @default null
  */
  shouldDisplayFunc: null,

  /**
    Whether the template rendered by this view gets passed the context object
    of its parent template, or gets passed the value of retrieving `property`
    from the previous context.

    For example, this is true when using the `{{#if}}` helper, because the template
    inside the helper should look up properties relative to the same object as
    outside the block. This would be NO when used with `{{#with foo}}` because
    the template should receive the object found by evaluating `foo`.

    @type Boolean
    @default false
  */
  preserveContext: false,

  /**
    The template to render when `shouldDisplayFunc` evaluates to true.

    @type Function
    @default null
  */
  displayTemplate: null,

  /**
    The template to render when `shouldDisplayFunc` evaluates to false.

    @type Function
    @default null
  */
  inverseTemplate: null,

  /**
    The key to look up on `previousContext` that is passed to
    `shouldDisplayFunc` to determine which template to render.

    In addition, if `preserveContext` is false, this object will be passed to the
    template when rendering.

    @type String
    @default null
  */
  property: null,

  /**
    Determines which template to invoke, sets up the correct state based on
    that logic, then invokes the default SC.View `render` implementation.

    This method will first look up the `property` key on `previousContext`,
    then pass that value to the `shouldDisplayFunc` function. If that returns
    true, the `displayTemplate` function will be rendered to DOM. Otherwise,
    `inverseTemplate`, if specified, will be rendered.

    For example, if this SC._BindableSpan represented the {{#with foo}} helper,
    it would look up the `foo` property of its context, and `shouldDisplayFunc`
    would always return true. The object found by looking up `foo` would be
    passed to `displayTemplate`.

    @param {SC.RenderBuffer} buffer
  */
  render: function(buffer) {
    // If not invoked via a triple-mustache ({{{foo}}}), escape
    // the content of the template.
    if(this.get('isEscaped')) { buffer.set('escapeContent', true); }

    var shouldDisplay = this.get('shouldDisplayFunc'),
        property = this.get('property'),
        preserveContext = this.get('preserveContext'),
        context = this.get('previousContext');

    var inverseTemplate = this.get('inverseTemplate'),
        displayTemplate = this.get('displayTemplate');

    var result = context.getPath(property);

    // First, test the conditional to see if we should
    // render the template or not.
    if (shouldDisplay(result)) {
      this.set('template', displayTemplate);

      // If we are preserving the context (for example, if this
      // is an #if block, call the template with the same object.
      if (preserveContext) {
        this.set('templateContext', context);
      } else {
      // Otherwise, determine if this is a block bind or not.
      // If so, pass the specified object to the template
        if (displayTemplate) {
          this.set('templateContext', result);
        } else {
        // This is not a bind block, just push the result of the
        // expression to the render context and return.
          buffer.push(result);
          return;
        }
      }
    } else if (inverseTemplate) {
      this.set('template', inverseTemplate);

      if (preserveContext) {
        this.set('templateContext', context);
      } else {
        this.set('templateContext', result);
      }
    } else {
      this.set('template', function() { return ''; });
    }

    return sc_super();
  },

  /**
    Called when the property associated with this `<span>` changes.

    We destroy all registered children, then render the view again and insert
    it into DOM.
  */
  rerender: function() {
    var elem;

    this.destroyAllChildren();

    // Destroy the existing element and replace it with
    // a new element by re-running the render method.
    // This is used instead of calling destroyElement()/createElement()
    // to maintain position in the DOM.
    var buffer = this.renderBuffer(this.get('tagName'));
    if(this.get('isEscaped')) { buffer.set('escapeContent', true); }
    this.renderToBuffer(buffer);

    elem = buffer.element();
    this.$().replaceWith(elem);
    this.set('element', elem);

    this._notifyDidCreateElement();
  }
});
