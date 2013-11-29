
  test("routeless transitionTo in mid-transition uses transition's destination route for query params, not the router's current route", function() {
    expect(2);
    Router.map(function() {
      this.resource('woot', { path: '/woot' }, function() {
        this.route('yeah');
      });
    });

    App.WootYeahController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'lol'
    });

    var redirectCount = 0;
    App.WootRoute = Ember.Route.extend({
      redirect: function() {
        redirectCount++;
        // Keep transitioning to WootYeah but alter its
        // query params to foo: 'yeah'
        this.transitionTo({ queryParams: { foo: 'yeah' } });
      }
    });

    bootApplication();

    Ember.run(router, 'transitionTo', 'woot.yeah');
    equal(router.get('location.path'), "/woot/yeah?woot.yeah[foo]=yeah");
    equal(redirectCount, 1, "redirect was only run once");
  });
