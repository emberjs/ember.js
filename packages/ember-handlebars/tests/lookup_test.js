module("Ember.Handlebars.resolveParams");

test("Raw string parameters should be returned as Strings", function() {
  var params = Ember.Handlebars.resolveParams({}, ["foo", "bar", "baz"], { types: ["STRING", "STRING", "STRING"] });
  deepEqual(params, ["foo", "bar", "baz"]);
});

test("Raw boolean parameters should be returned as Booleans", function() {
  var params = Ember.Handlebars.resolveParams({}, [true, false], { types: ["BOOLEAN", "BOOLEAN"] });
  deepEqual(params, [true, false]);
});

test("Raw numeric parameters should be returned as Numbers", function() {
  var params = Ember.Handlebars.resolveParams({}, [1, 1.0, 1.5, 0.5], { types: ["NUMBER", "NUMBER", "NUMBER", "NUMBER"] });
  deepEqual(params, [1, 1, 1.5, 0.5]);
});

test("ID parameters should be looked up on the context", function() {
  var context = {
    salutation: "Mr",
    name: {
      first: "Tom",
      last: "Dale"
    }
  };

  var params = Ember.Handlebars.resolveParams(context, ["salutation", "name.first", "name.last"], { types: ["ID", "ID", "ID"] });
  deepEqual(params, ["Mr", "Tom", "Dale"]);
});

if (Ember.FEATURES.isEnabled("ember-handlebars-caps-lookup")) {
  test("ID parameters that start with capital letters use Ember.lookup as their context", function() {
    Ember.lookup.FOO = "BAR";

    var context = { FOO: "BAZ" };

    var params = Ember.Handlebars.resolveParams(context, ["FOO"], { types: ["ID"] });
    deepEqual(params, ["BAR"]);
  });
}

test("ID parameters can look up keywords", function() {
  var controller = {
    salutation: "Mr"
  };

  var view = {
    name: { first: "Tom", last: "Dale" }
  };

  var context = {
    yuno: "State Charts"
  };

  var options = {
    types: ["ID", "ID", "ID", "ID"],
    data: {
      keywords: {
        controller: controller,
        view: view
      }
    }
  };

  var params = Ember.Handlebars.resolveParams(context, ["controller.salutation", "view.name.first", "view.name.last", "yuno"], options);
  deepEqual(params, ["Mr", "Tom", "Dale", "State Charts"]);
});

module("Ember.Handlebars.resolveHash");

test("Raw string parameters should be returned as Strings", function() {
  var hash = Ember.Handlebars.resolveHash({}, { string: "foo" }, { hashTypes: { string: "STRING" } });
  deepEqual(hash, { string: "foo" });
});

test("Raw boolean parameters should be returned as Booleans", function() {
  var hash = Ember.Handlebars.resolveHash({}, { yes: true, no: false }, { hashTypes: { yes: "BOOLEAN", no: "BOOLEAN" } });
  deepEqual(hash, { yes: true, no: false });
});

test("Raw numeric parameters should be returned as Numbers", function() {
  var hash = Ember.Handlebars.resolveHash({}, { one: 1, oneFive: 1.5, ohFive: 0.5 }, { hashTypes: { one: "NUMBER", oneFive: "NUMBER", ohFive: "NUMBER" } });
  deepEqual(hash, { one: 1, oneFive: 1.5, ohFive: 0.5 });
});

test("ID parameters should be looked up on the context", function() {
  var context = {
    salutation: "Mr",
    name: {
      first: "Tom",
      last: "Dale"
    }
  };

  var hash = Ember.Handlebars.resolveHash(context, { mr: "salutation", firstName: "name.first", lastName: "name.last" }, { hashTypes: { mr: "ID", firstName: "ID", lastName: "ID" } });
  deepEqual(hash, { mr: "Mr", firstName: "Tom", lastName: "Dale" });
});

test("ID parameters can look up keywords", function() {
  var controller = {
    salutation: "Mr"
  };

  var view = {
    name: { first: "Tom", last: "Dale" }
  };

  var context = {
    yuno: "State Charts"
  };

  var options = {
    hashTypes: { mr: "ID", firstName: "ID", lastName: "ID", yuno: "ID" },
    data: {
      keywords: {
        controller: controller,
        view: view
      }
    }
  };

  var hash = Ember.Handlebars.resolveHash(context, { mr: "controller.salutation", firstName: "view.name.first", lastName: "view.name.last", yuno: "yuno" }, options);
  deepEqual(hash, { mr: "Mr", firstName: "Tom", lastName: "Dale", yuno: "State Charts" });
});
