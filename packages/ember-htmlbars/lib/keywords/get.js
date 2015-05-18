import Stream from "ember-metal/streams/stream";
import { labelFor } from "ember-metal/streams/utils";
import { read, isStream } from "ember-metal/streams/utils";
import create from "ember-metal/platform/create";
import merge from "ember-metal/merge";
import SafeString from "htmlbars-util/safe-string";

if (Ember.FEATURES.isEnabled('ember-htmlbars-get-helper')) {

  var getKeyword = function getKeyword(morph, env, scope, params, hash, template, inverse, visitor) {
    var objParam = params[0];
    var pathParam = params[1];

    Ember.assert("The first argument to {{get}} must be a stream", isStream(objParam));
    Ember.assert("{{get}} requires at least two arguments", params.length > 1);

    var getStream = new GetStream(objParam, pathParam);

    if (morph === null) {
      return getStream;
    } else {
      env.hooks.inline(morph, env, scope, '-get', [getStream], hash, visitor);
    }

    return true;
  };

  var workaroundValue = function workaroundValue(value) {
    // this is used to compensate for the following line of code
    //     if (result && result.value) {
    // in the 'inline' hook. If the stream returns a falsy value after
    // previously returning a truthy value, this line causes the value not
    // to be updated

    // so for falsey values we need to enforce something that evalutes to
    // truthy but returns an empty string.

    // this can be removed if the `inline` hook handles it.

    return value || new SafeString('');
  };


  var GetStream = function GetStream(obj, path) {
    this.init('(get '+labelFor(obj)+' '+labelFor(path)+')');

    this.objectParam = obj;
    this.pathParam = path;
    this.lastPathValue = undefined;
    this.valueDep = this.addMutableDependency();

    this.addDependency(path);

    // This next line is currently only required when the keyword
    // is executed in a subexpression. More investigation required
    // to remove the additional dependency
    this.addDependency(obj);
  };

  GetStream.prototype = create(Stream.prototype);

  merge(GetStream.prototype, {
    updateValueDependency() {
      var pathValue = read(this.pathParam);

      if (this.lastPathValue !== pathValue) {
        if (typeof pathValue === 'string') {
          this.valueDep.replace(this.objectParam.get(pathValue));
        } else {
          this.valueDep.replace();
        }

        this.lastPathValue = pathValue;
      }
    },

    compute() {
      this.updateValueDependency();
      return workaroundValue(this.valueDep.getValue());
    },

    setValue(value) {
      this.updateValueDependency();
      this.valueDep.setValue(value);
    }

  });

}

export default getKeyword;
