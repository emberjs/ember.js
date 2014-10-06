import presence from 'ember-metal/presence';

if (Ember.FEATURES.isEnabled('ember-metal-presence')) {
  QUnit.module("Ember.presence");

  test("Ember.presence", function() {
    var string = "This is present",
        fn = function() {},
        arr = [1,2,3],
        object = {ember: 'Rocks'},
        zeroLengthObject = {length: 0};

    equal(null, presence(),                    "for no params");
    equal(null, presence(null),                "for null");
    equal(null, presence(undefined),           "for undefined");
    equal(null, presence(""),                  "for an empty String");
    equal(null, presence("  "),                "for a whitespace String");
    equal(null, presence("\n\t"),              "for another whitespace String");
    equal("\n\t Hi", presence("\n\t Hi"),      "for a String with whitespaces");
    equal(true, presence(true),                "for true");
    equal(false, presence(false),              "for false");
    equal(string, presence(string),            "for a String");
    equal(fn, presence(fn),                    "for a Function");
    equal(0, presence(0),                      "for 0");
    equal(null, presence([]),                  "for an empty Array");
    //equal(null, presence({}),                  "for an empty Object"); // still not sure what the output here should be
    equal(null, presence(zeroLengthObject),    "for an Object that has zero 'length'");
    equal(object, presence(object),            "for an Object that a length > 0");
    equal(arr, presence(arr),                  "for a non-empty array");
  });
}
