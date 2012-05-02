var get = Ember.get, set = Ember.set;

/**

  When used in a Handlebars template that is assigned to an `Ember.View` instance's
  `layout` property Ember will render the layout template first, inserting the view's
  own rendered output at the `{{ yield }}` location.

  An empty `<body>` and the following application code:

        AView = Ember.View.extend({
          classNames: ['a-view-with-layout'],
          layout: Ember.Handlebars.compile('<div class="wrapper">{{ yield }}</div>'),
          template: Ember.Handlebars.compile('<span>I am wrapped</span>')
        })

        aView = AView.create()
        aView.appendTo('body')

  Will result in the following HTML output:

        <body>
          <div class='ember-view a-view-with-layout'>
            <div class="wrapper">
              <span>I am wrapped</span>
            </div>
          </div>
        </body>


  The yield helper cannot be used outside of a template assigned to an `Ember.View`'s `layout` property
  and will throw an error if attempted.

      BView = Ember.View.extend({
        classNames: ['a-view-with-layout'],
        template: Ember.Handlebars.compile('{{yield}}')
      })

      bView = BView.create()
      bView.appendTo('body')

      // throws
      // Uncaught Error: assertion failed: You called yield in a template that was not a layout

  @name Handlebars.helpers.yield
  @param {Hash} options
  @returns {String} HTML string
*/
Ember.Handlebars.registerHelper('yield', function(options) {
  var view = options.data.view, template;

  while (view && !get(view, 'layout')) {
    view = get(view, 'parentView');
  }

  Ember.assert("You called yield in a template that was not a layout", !!view);

  template = get(view, 'template');

  if (template) { template(this, options); }
});
