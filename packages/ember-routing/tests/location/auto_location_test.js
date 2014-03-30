var copy = Ember.copy, AutoLocation = Ember.AutoLocation,
    AutoLocationTest;

module("Auto Location", {
  setup: function() {
    AutoLocationTest = copy(AutoLocation);
  },

  teardown: function() {
    AutoLocationTest = null;
  }
});

test("replacePath cannot be used to redirect to a different origin (website)", function() {
  expect(1);

  var expectedURL;

  AutoLocationTest._location = {
    protocol: 'http:',
    hostname: 'emberjs.com',
    port: '1337',

    replace: function (url) {
      equal(url, expectedURL);
    }
  };

  expectedURL = 'http://emberjs.com:1337//google.com';
  AutoLocationTest.replacePath('//google.com');
});