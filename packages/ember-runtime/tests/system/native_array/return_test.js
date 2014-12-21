import EmberArray from 'ember-runtime/mixins/array';

QUnit.module("NativeArray methods return an Array with the correct methods");

test("concat returns a NativeArray", function () {
    var returnedArray = Ember.A().concat();

    ok(EmberArray.detect(returnedArray), "returned value should be an EmberArray");
});

test("filter returns a NativeArray", function () {
    var returnedArray = Ember.A().filter(function () {});

    ok(EmberArray.detect(returnedArray), "returned value should be an EmberArray");
});

test("map returns a NativeArray", function () {
    var returnedArray = Ember.A().map(function () {});

    ok(EmberArray.detect(returnedArray), "returned value should be an EmberArray");
});

test("slice returns a NativeArray", function () {
    var returnedArray = Ember.A().slice();

    ok(EmberArray.detect(returnedArray), "returned value should be an EmberArray");
});

test("sort returns a NativeArray", function () {
    var returnedArray = Ember.A().sort();

    ok(EmberArray.detect(returnedArray), "returned value should be an EmberArray");
});

test("splice returns a NativeArray", function () {
    var returnedArray = Ember.A().splice();

    ok(EmberArray.detect(returnedArray), "returned value should be an EmberArray");
});
