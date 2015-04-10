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

export default function AttrNode(attrName, attrValue) {
  this.init(attrName, attrValue);
}

export var styleWarning = 'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
                          'please ensure that values being bound are properly escaped. For more information, ' +
                          'including how to disable this warning, see ' +
                          'http://emberjs.com/deprecations/v1.x/#toc_binding-style-attributes.';

AttrNode.prototype.init = function init(attrName, simpleAttrValue) {
  this.isAttrNode = true;
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

  if (value === undefined) {
    value = null;
  }

  if (this.attrName === 'value') {
    if (value === null) {
      value = '';
    }

    if (this.hasRenderedInitially && this._morph.element.value === value) {
      // If user is typing in a value we don't want to rerender and lose cursor position.
      this.lastValue = value;
      return;
    }
  }

  if (this.lastValue !== null || value !== null) {
    var elementClassName = this._morph.element.className;
    if (this.attrName === "class" && elementClassName && this.lastValue !== elementClassName && typeof elementClassName === "string") {
      this.renderWithAlienClass(value);
    } else {
      this._deprecateEscapedStyle(value);
      this._morph.setContent(value);
    }

    this.lastValue = value;
    this.hasRenderedInitially = true;
  }
};

AttrNode.prototype.renderWithAlienClass = function AttrNode_renderWithAlienClass(value) {
  var citizenClasses = this.lastValue ? this.lastValue.split(" ") : [];
  var allClasses = this._morph.element.className.split(" ");
  var alienClasses = [];
  var className;

  for (var i = 0; i < allClasses.length; i++) {
    className = allClasses[i];
    if (citizenClasses.indexOf(className) < 0) {
      alienClasses.push(className);
    }
  }

  this._morph.setContent(value + " " + alienClasses.join(" "));
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

AttrNode.prototype.rerender = function AttrNode_render() {
  this.isDirty = true;
  run.schedule('render', this, this.renderIfDirty);
};

AttrNode.prototype.destroy = function AttrNode_destroy() {
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
