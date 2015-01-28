import { replacePath } from "ember-routing/location/util";

QUnit.module("Location Utilities");

test("replacePath cannot be used to redirect to a different origin", function() {
  expect(1);

  var expectedURL;

  var location = {
    protocol: 'http:',
    hostname: 'emberjs.com',
    port: '1337',

    replace: function (url) {
      equal(url, expectedURL);
    }
  };

  expectedURL = 'http://emberjs.com:1337//google.com';
  replacePath(location, '//google.com');
});
