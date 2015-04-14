/**
@module ember
@submodule ember-views
*/

import { _Metamorph } from "ember-views/views/metamorph_view";
import { read, subscribe, unsubscribe } from "ember-metal/streams/utils";
import { readComponentFactory } from "ember-views/streams/utils";
import mergeViewBindings from "ember-htmlbars/system/merge-view-bindings";
import EmberError from "ember-metal/error";
import ContainerView from "ember-views/views/container_view";
import View from "ember-views/views/view";

export default ContainerView.extend(_Metamorph, {
  init() {
    this._super(...arguments);
    this.componentNameStream = this._boundComponentOptions.componentNameStream;

    subscribe(this.componentNameStream, this._updateBoundChildComponent, this);
    this._updateBoundChildComponent();
  },
  willDestroy() {
    unsubscribe(this.componentNameStream, this._updateBoundChildComponent, this);
    this._super(...arguments);
  },
  _updateBoundChildComponent() {
    this.replace(0, 1, [this._createNewComponent()]);
  },
  _createNewComponent() {
    var componentName = read(this.componentNameStream);
    if (!componentName) {
      return this.createChildView(View);
    }

    var componentClass = readComponentFactory(componentName, this.container);
    if (!componentClass) {
      throw new EmberError('HTMLBars error: Could not find component named "' + read(this._boundComponentOptions.componentNameStream) + '".');
    }
    var hash    = this._boundComponentOptions;
    var hashForComponent = {};

    var prop;
    for (prop in hash) {
      if (prop === '_boundComponentOptions' || prop === 'componentNameStream') { continue; }
      hashForComponent[prop] = hash[prop];
    }

    var props   = {};
    mergeViewBindings(this, props, hashForComponent);
    return this.createChildView(componentClass, props);
  }
});
