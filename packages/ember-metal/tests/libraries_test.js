var libs = Ember.libraries;

test('Ember registers itself', function() {
  equal(libs[0].name, "Ember");
});

test('core libraries come before other libraries', function() {
  var l = libs.length;

  libs.register("my-lib", "2.0.0a");
  libs.registerCoreLibrary("DS", "1.0.0-beta.2");

  equal(libs[l].name, "DS");
  equal(libs[l+1].name, "my-lib");

  libs.deRegister("my-lib");
  libs.deRegister("DS");
});

test('only the first registration of a library is stored', function() {
  var l = libs.length;

  libs.register("magic", 1.23);
  libs.register("magic", 2.23);
  libs.register("magic", 3.23);

  equal(libs[l].name, "magic");
  equal(libs[l].version, 1.23);
  equal(libs.length, l+1);

  libs.deRegister("magic");
});

test('libraries can be de-registered', function() {
  var l = libs.length;

  libs.register("lib1", "1.0.0b");
  libs.register("lib2", "1.0.0b");
  libs.register("lib3", "1.0.0b");

  libs.deRegister("lib1");
  libs.deRegister("lib3");

  equal(libs[l].name, "lib2");
  equal(libs.length, l+1);

  libs.deRegister("lib2");
});
