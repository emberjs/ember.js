/**
@module ember
@submodule ember-views
*/

import EmberError from "ember-metal/error";
import run from "ember-metal/run_loop";
import {
  GUID_KEY,
  uuid
} from "ember-metal/utils";

function K() { return this; }

function SimpleBoundView(stream) {
  this.stream = stream;
  this[GUID_KEY] = uuid();
  this._lastNormalizedValue = undefined;
  this.state = 'preRender';
  this.updateId = null;
  this._parentView = null;
  this.buffer = null;
  this._morph = null;
}

SimpleBoundView.prototype = {
  isVirtual: true,
  isView: true,
  tagName: '',

  destroy: function () {
    if (this.updateId) {
      run.cancel(this.updateId);
      this.updateId = null;
    }
    if (this._parentView) {
      this._parentView.removeChild(this);
    }
    this.morph = null;
    this.state = 'destroyed';
  },

  propertyWillChange: K,

  propertyDidChange: K,

  normalizedValue: function() {
    var result = this.stream.value();

    if (result === null || result === undefined) {
      return "";
    } else {
      return result;
    }
  },

  render: function(buffer) {
    var value = this.normalizedValue();
    this._lastNormalizedValue = value;
    buffer._element = value;
  },

  rerender: function() {
    switch(this.state) {
      case 'preRender':
      case 'destroyed':
        break;
      case 'inBuffer':
        throw new EmberError("Something you did tried to replace an {{expression}} before it was inserted into the DOM.");
      case 'hasElement':
      case 'inDOM':
        this.updateId = run.scheduleOnce('render', this, 'update');
        break;
    }
    return this;
  },

  update: function () {
    this.updateId = null;
    var value = this.normalizedValue();
    // doesn't diff SafeString instances
    if (value !== this._lastNormalizedValue) {
      this._lastNormalizedValue = value;
      this._morph.update(value);
    }
  },

  _transitionTo: function(state) {
    this.state = state;
  }
};

export function appendSimpleBoundView(parentView, morph, stream) {
  var view = new SimpleBoundView(stream);
  view._morph = morph;

  stream.subscribe(parentView._wrapAsScheduled(function() {
    run.scheduleOnce('render', view, 'rerender');
  }));

  parentView.appendChild(view);
}

export default SimpleBoundView;
