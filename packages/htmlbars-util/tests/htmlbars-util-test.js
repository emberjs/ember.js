import {SafeString} from "../htmlbars-util";

QUnit.module('htmlbars-util');

test("SafeString is exported", function(){
  ok(typeof SafeString === 'function', 'SafeString is exported');
});
