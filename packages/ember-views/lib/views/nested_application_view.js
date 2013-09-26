
if (Ember.FEATURES.isEnabled('nested-app')) {

  Ember.NestedApplicationView = Ember.View.extend({
    NestedApplication: null,
    setupApplication: Ember.on("didInsertElement", function() {
      this.app = this.NestedApplication.create({
        rootElement: this.get('element')
      });
    }),
    teardownApplication: Ember.on("willDestroyElement", function() {
      this.app.destroy();
    })
  });

}
