// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
test("Regular expression escaping a string", function() {
  same('\.+*?[^]$(){}=!<>|:'.escapeForRegExp(), '\\.\\+\\*\\?\\[\\^\\]\\$\\(\\)\\{\\}\\=\\!\\<\\>\\|\\:', "should be escaped");
});

test("Pluralizing a string", function() {
  expect(8);
  same('Goat'.pluralize(), 'Goats', "standard pluralization");
  same('There are many goat'.pluralize(), 'There are many goats', "standard pluralization of a multi-word string");
  same('Bunny'.pluralize(), 'Bunnies', "non-standard pluralization");
  same('I like bunny'.pluralize(), 'I like bunnies', "non-standard pluralization of a multi-word string");
  same('child'.pluralize(), 'children', "irregular pluralization");
  same('I have three child'.pluralize(), 'I have three children', "irregular pluralization of a multi-word string");
  same('sheep'.pluralize(), 'sheep', "uncountable pluralization");
  same('Please hold this sheep'.pluralize(), 'Please hold this sheep', "uncountable pluralization of a multi-word string");
});

test("Singularizing a string", function() {
  expect(8);
  same('Vegetables'.singularize(), 'Vegetable', "standard singularization");
  same('Broccoli is a vegetables'.singularize(), 'Broccoli is a vegetable', "standard singularization of a multi-word string");
  same('Properties'.singularize(), 'Property', "non-standard singularization");
  same('Buy a properties'.singularize(), 'Buy a property', "non-standard singularization of a multi-word string");
  same('people'.singularize(), 'person', "irregular singularization");
  same('The Village People'.singularize(), 'The Village Person', "irregular singularization of a multi-word string");
  same('money'.singularize(), 'money', "uncountable singularization");
  same('Gotta git da money'.singularize(), 'Gotta git da money', "uncountable singularization of a multi-word string");
});

