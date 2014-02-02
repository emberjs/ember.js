sc_require("handlebars");
sc_require("ext/handlebars");
sc_require("ext/handlebars/bind");
sc_require("ext/handlebars/collection");
sc_require("ext/handlebars/localization");
sc_require("ext/handlebars/view");

// Global hash of shared templates. This will automatically be populated
// by the build tools so that you can store your Handlebars templates in
// separate files that get loaded into JavaScript at buildtime.
SC.TEMPLATES = SC.Object.create();

/** @class

  SC.TemplateView allows you to create a view that uses the Handlebars templating
  engine to generate its HTML representation.

  To use it, create a file in your project called +mytemplate.handlebars+. Then,
  set the +templateName+ property of your SC.TemplateView to +mytemplate+.

  Alternatively, you can set the +template+ property to any function that
  returns a string. It is recommended that you use +SC.Handlebars.compile()+ to
  generate a function from a string containing Handlebars markup.

  @extends SC.CoreView
  @since SproutCore 1.5
*/
SC.TemplateView = SC.CoreView.extend(
/** @scope SC.TemplateView.prototype */ {

  // This makes it easier to build custom views on top of TemplateView without
  // gotchas, but may have tab navigation repercussions. The tab navigation
  // system should be revisited.
  acceptsFirstResponder: YES,

  /**
    The name of the template to lookup if no template is provided.

    SC.TemplateView will look for a template with this name in the global
    +SC.TEMPLATES+ hash. Usually this hash will be populated for you
    automatically when you include +.handlebars+ files in your project.

    @type String
  */
  templateName: null,

  /**
    The hash in which to look for +templateName+. Defaults to SC.TEMPLATES.

    @type Object
  */
  templates: SC.TEMPLATES,

  /**
    The template used to render the view. This should be a function that
    accepts an optional context parameter and returns a string of HTML that
    will be inserted into the DOM relative to its parent view.

    In general, you should set the +templateName+ property instead of setting
    the template yourself.

    @type Function
  */
  template: function(key, value) {
    if (value !== undefined) {
      return value;
    }

    var templateName = this.get('templateName'),
        template = this.get('templates').get(templateName);

    if (!template) {
      //@if(debug)
      if (templateName) {
        SC.Logger.warn('%@ - Unable to find template "%@".'.fmt(this, templateName));
      }
      //@endif

      return function() { return ''; };
    }

    return template;
  }.property('templateName').cacheable(),

  /**
    The object from which templates should access properties.

    This object will be passed to the template function each time the render
    method is called, but it is up to the individual function to decide what
    to do with it.

    By default, this will be the view itself.

    @type Object
  */
  context: function(key, value) {
    if (value !== undefined) {
      return value;
    }

    return this;
  }.property().cacheable(),

  /**
    When the view is asked to render, we look for the appropriate template
    function and invoke it, then push its result onto the passed
    SC.RenderContext instance.

    @param {SC.RenderContext} context the render context
  */
  render: function(context) {
    var data,
        output,
        template = this.get('template'),
        templateContext = this.get('context');

    this._didRenderChildViews = YES;

    data = { view: this, isRenderData: true };
    output = template(templateContext, { data: data });

    context.push(output);
  },

  // in TemplateView, updating is handled by observers created by helpers in the
  // template. As a result, we create an empty update method so that the old
  // (pre-1.5) behavior which would force a full re-render does not get activated.
  update: function() { },

  /**
    Since mouseUp events will not fire unless we return YES to mouseDown, the
    default mouseDown implementation returns YES if a mouseDown method exists.
  */
  mouseDown: function() {
    if (this.mouseUp) { return YES; }
    return NO;
  }
});
