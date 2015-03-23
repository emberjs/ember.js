/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import {
  read,
  subscribe,
  unsubscribe
} from "ember-metal/streams/utils";
import run from "ember-metal/run_loop";

function AttrNode(attrName, attrValue) {
  this.init(attrName, attrValue);
}

export var styleWarning = 'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
                          'please ensure that values being bound are properly escaped. For more information, ' +
                          'including how to disable this warning, see ' +
                          'http://emberjs.com/deprecations/v1.x/#toc_warning-when-binding-style-attributes.';

AttrNode.prototype.init = function init(attrName, simpleAttrValue) {
  this.isView = true;

  this.tagName = '';
  this.isVirtual = true;

  this.attrName = attrName;
  this.attrValue = simpleAttrValue;
  this.isDirty = true;
  this.isDestroying = false;
  this.lastValue = null;
  this.hasRenderedInitially = false;

  subscribe(this.attrValue, this.rerender, this);
};

AttrNode.prototype.renderIfDirty = function renderIfDirty() {
  if (this.isDirty && !this.isDestroying) {
    var value = read(this.attrValue);
    if (value !== this.lastValue) {
      this._renderer.renderTree(this, this._parentView);
    } else {
      this.isDirty = false;
    }
  }
};

AttrNode.prototype.render = function render(buffer) {
  this.isDirty = false;
  if (this.isDestroying) {
    return;
  }

  var value = read(this.attrValue);

  if (this.attrName === 'value' && (value === null || value === undefined)) {
    value = '';
  }

  if (value === undefined) {
    value = null;
  }


  // If user is typing in a value we don't want to rerender and loose cursor position.
  if (this.hasRenderedInitially && this.attrName === 'value' && this._morph.element.value === value) {
    this.lastValue = value;
    return;
  }

  if (this.lastValue !== null || value !== null) {
    this._deprecateEscapedStyle(value);
    this._morph.setContent(value);
    this.lastValue = value;
    this.hasRenderedInitially = true;
  }
};

AttrNode.prototype._deprecateEscapedStyle = function AttrNode_deprecateEscapedStyle(value) {
  Ember.warn(
    styleWarning,
    (function(name, value, escaped) {
      // SafeString
      if (value && value.toHTML) {
        return true;
      }

      if (name !== 'style') {
        return true;
      }

      return !escaped;
    }(this.attrName, value, this._morph.escaped))
  );
};

AttrNode.prototype.rerender = function render() {
  this.isDirty = true;
  run.schedule('render', this, this.renderIfDirty);
};

AttrNode.prototype.destroy = function render() {
  this.isDestroying = true;
  this.isDirty = false;

  unsubscribe(this.attrValue, this.rerender, this);

  if (!this.removedFromDOM && this._renderer) {
    this._renderer.remove(this, true);
  }
};

AttrNode.prototype.propertyDidChange = function render() {
};

AttrNode.prototype._notifyBecameHidden = function render() {
};

AttrNode.prototype._notifyBecameVisible = function render() {
};

export default AttrNode;
