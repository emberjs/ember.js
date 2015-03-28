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

function SimpleBoundView(parentView, renderer, morph, stream) {
  this.stream = stream;
  this[GUID_KEY] = uuid();
  this._lastNormalizedValue = undefined;
  this.state = 'preRender';
  this.updateId = null;
  this._parentView = parentView;
  this.buffer = null;
  this._morph = morph;
  this.renderer = renderer;
}

SimpleBoundView.prototype = {
  isVirtual: true,
  isView: true,
  tagName: '',

  destroy() {
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

  normalizedValue() {
    var result = this.stream.value();

    if (result === null || result === undefined) {
      return "";
    } else {
      return result;
    }
  },

  render(buffer) {
    var value = this.normalizedValue();
    this._lastNormalizedValue = value;
    buffer._element = value;
  },

  rerender() {
    switch (this.state) {
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

  update() {
    this.updateId = null;
    var value = this.normalizedValue();
    // doesn't diff SafeString instances
    if (value !== this._lastNormalizedValue) {
      this._lastNormalizedValue = value;
      this._morph.setContent(value);
    }
  },

  _transitionTo(state) {
    this.state = state;
  }
};

SimpleBoundView.create = function(attrs) {
  return new SimpleBoundView(attrs._parentView, attrs.renderer, attrs._morph, attrs.stream);
};

SimpleBoundView.isViewClass = true;

export function appendSimpleBoundView(parentView, morph, stream) {
  var view = parentView.appendChild(SimpleBoundView, { _morph: morph, stream: stream });

  stream.subscribe(parentView._wrapAsScheduled(function() {
    run.scheduleOnce('render', view, 'rerender');
  }));
}

export default SimpleBoundView;
