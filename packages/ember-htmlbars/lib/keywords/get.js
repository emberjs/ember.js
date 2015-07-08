import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import Stream from 'ember-metal/streams/stream';
import { labelFor } from 'ember-metal/streams/utils';
import { read, isStream } from 'ember-metal/streams/utils';
import merge from 'ember-metal/merge';

if (isEnabled('ember-htmlbars-get-helper')) {
  var getKeyword = function getKeyword(morph, env, scope, params, hash, template, inverse, visitor) {
    var objParam = params[0];
    var pathParam = params[1];

    Ember.assert('The first argument to {{get}} must be a stream', isStream(objParam));
    Ember.assert('{{get}} requires at least two arguments', params.length > 1);

    var getStream = new GetStream(objParam, pathParam);

    if (morph === null) {
      return getStream;
    } else {
      env.hooks.inline(morph, env, scope, '-get', [getStream], hash, visitor);
    }

    return true;
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

  GetStream.prototype = Object.create(Stream.prototype);

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
      return this.valueDep.getValue();
    },

    setValue(value) {
      this.updateValueDependency();
      this.valueDep.setValue(value);
    }

  });
}

export default getKeyword;
