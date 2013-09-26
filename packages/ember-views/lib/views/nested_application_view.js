
if (Ember.FEATURES.isEnabled('nested-app')) {

  Ember.NestedApplicationView = Ember.View.extend({
    NestedApplication: null,
    application: Ember.computed(function() {
      return this.container.lookup('application:main');
    }),
    setupApplication: Ember.on("didInsertElement", function() {
      this.app = this.NestedApplication.create({
        rootElement: this.get('element')
      });
      this.get('application').registerChildApp(this.app);
    }),
    teardownApplication: Ember.on("willDestroyElement", function() {
      this.app.destroy();
      this.get('application').unregisterChildApp(this.app);
    })
  });

}
