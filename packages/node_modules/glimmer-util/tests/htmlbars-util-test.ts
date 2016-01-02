import {SafeString} from "glimmer-util";

QUnit.module('glimmer-util');

test("SafeString is exported", function(){
  ok(typeof SafeString === 'function', 'SafeString is exported');
});
