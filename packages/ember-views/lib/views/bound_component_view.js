/**
@module ember
@submodule ember-views
*/

import { _Metamorph } from "ember-views/views/metamorph_view";
import { read, chain, subscribe, unsubscribe } from "ember-metal/streams/utils";
import { readComponentFactory } from "ember-views/streams/utils";
import mergeViewBindings from "ember-htmlbars/system/merge-view-bindings";
import EmberError from "ember-metal/error";
import ContainerView from "ember-views/views/container_view";

export default ContainerView.extend(_Metamorph, {
  init: function() {
    this._super(...arguments);
    var componentNameStream = this._boundComponentOptions.componentNameStream;
    var container = this.container;
    this.componentClassStream = chain(componentNameStream, function() {
      return readComponentFactory(componentNameStream, container);
    });

    subscribe(this.componentClassStream, this._updateBoundChildComponent, this);
    this._updateBoundChildComponent();
  },
  willDestroy: function() {
    unsubscribe(this.componentClassStream, this._updateBoundChildComponent, this);
    this._super(...arguments);
  },
  _updateBoundChildComponent: function() {
    this.replace(0, 1, [this._createNewComponent()]);
  },
  _createNewComponent: function() {
    var componentClass = read(this.componentClassStream);
    if (!componentClass) {
      throw new EmberError('HTMLBars error: Could not find component named "' + read(this._boundComponentOptions.componentNameStream) + '".');
    }
    var hash    = this._boundComponentOptions;
    var hashForComponent = {};

    var prop;
    for (prop in hash) {
      if (prop === '_boundComponentOptions' || prop === 'componentClassStream') { continue; }
      hashForComponent[prop] = hash[prop];
    }

    var props   = {};
    mergeViewBindings(this, props, hashForComponent);
    return this.createChildView(componentClass, props);
  }
});
