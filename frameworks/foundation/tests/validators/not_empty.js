// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */
var notEmptyValidator, field;

module("SC.Validator.NotEmpty", {
    setup: function () {
        notEmptyValidator = SC.Validator.NotEmpty.create();
        field = SC.Object.create();
    },
    teardown: function () {
        notEmptyValidator.destroy();
        notEmptyValidator = null;
    }
});

test("Recognizes a non-empty string as valid",function(){
    field.set('fieldValue', "fnord");
    var isValid = notEmptyValidator.validate(undefined, field);
    ok(isValid, "Not empty string is valid");
});

test("Recognizes empty string as invalid",function(){
    field.set('fieldValue', "");
    var isValid = notEmptyValidator.validate(undefined, field);
    ok( ! isValid, "Empty string is not valid");
});

test("Recognizes null as empty",function(){
    field.set('fieldValue', null);
    var isValid = notEmptyValidator.validate(undefined, field);
    ok( ! isValid, "null string is not valid");
});

test("Recognizes undefined as empty",function(){
    field.set('fieldValue', undefined);
    var isValid = notEmptyValidator.validate(undefined, field);
    ok( ! isValid, "null string is not valid");
});

test("Recognizes some number as non-empty",function(){
    field.set('fieldValue', 42);
    var isValid = notEmptyValidator.validate(undefined, field);
    ok(isValid, "42 string is not empty");
});

test("Recognizes zero as non-empty",function(){
    field.set('fieldValue', 0);
    var isValid = notEmptyValidator.validate(undefined, field);
    ok(isValid, "0 string is not empty");
});

