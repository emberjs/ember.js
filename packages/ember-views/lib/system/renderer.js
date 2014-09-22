import Renderer from 'ember-metal-views/renderer';
import { create } from 'ember-metal/platform';
import renderBuffer from "ember-views/system/render_buffer";
import run from "ember-metal/run_loop";
import { set } from "ember-metal/property_set";
import { _instrumentStart, subscribers } from "ember-metal/instrumentation";

function EmberRenderer() {
  this.buffer = renderBuffer();
  this._super$constructor();
}

EmberRenderer.prototype = create(Renderer.prototype);
EmberRenderer.prototype.constructor = EmberRenderer;
EmberRenderer.prototype._super$constructor = Renderer;

EmberRenderer.prototype.scheduleRender =
  function EmberRenderer_scheduleRender(ctx, fn) {
    return run.scheduleOnce('render', ctx, fn);
  };

EmberRenderer.prototype.cancelRender =
  function EmberRenderer_cancelRender(id) {
    run.cancel(id);
  };

EmberRenderer.prototype.createElement =
  function EmberRenderer_createElement(view, contextualElement) {
    // If this is the top-most view, start a new buffer. Otherwise,
    // create a new buffer relative to the original using the
    // provided buffer operation (for example, `insertAfter` will
    // insert a new buffer after the "parent buffer").
    var tagName = view.tagName;
    if (tagName === null || tagName === undefined) {
      tagName = 'div';
    }

    var buffer = view.buffer = this.buffer;
    buffer.reset(tagName, contextualElement);

    if (view.beforeRender) {
      view.beforeRender(buffer);
    }

    if (view.tagName !== '') {
      if (view.applyAttributesToBuffer) {
        view.applyAttributesToBuffer(buffer);
      }
      buffer.generateElement();
    }

    if (view.render) {
      view.render(buffer);
    }

    if (view.afterRender) {
      view.afterRender(buffer);
    }

    var element = buffer.element();

    view.buffer = null;
    if (element && element.nodeType === 1) {
      // We have hooks, we shouldn't make element observable
      // consider just doing view.element = element
      set(view, 'element', element);
    }
    return element;
  };

EmberRenderer.prototype.destroyView = function destroyView(view) {
  view.removedFromDOM = true;
  view.destroy();
};

EmberRenderer.prototype.childViews = function childViews(view) {
  return view._childViews;
};

Renderer.prototype.willCreateElement = function (view) {
  if (subscribers.length && view.instrumentDetails) {
    view._instrumentEnd = _instrumentStart('render.'+view.instrumentName, function viewInstrumentDetails() {
      var details = {};
      view.instrumentDetails(details);
      return details;
    });
  }
  if (view._transitionTo) {
    view._transitionTo('inBuffer');
  }
}; // inBuffer
Renderer.prototype.didCreateElement = function (view) {
  if (view._transitionTo) {
    view._transitionTo('hasElement');
  }
  if (view._instrumentEnd) {
    view._instrumentEnd();
  }
}; // hasElement
Renderer.prototype.willInsertElement = function (view) {
  if (view.trigger) { view.trigger('willInsertElement'); }
}; // will place into DOM
Renderer.prototype.didInsertElement = function (view) {
  if (view._transitionTo) {
    view._transitionTo('inDOM');
  }
  if (view.trigger) { view.trigger('didInsertElement'); }
}; // inDOM // placed into DOM

Renderer.prototype.willRemoveElement = function (view) {};

Renderer.prototype.willDestroyElement = function (view) {
  if (view.trigger) { view.trigger('willDestroyElement'); }
  if (view.trigger) { view.trigger('willClearRender'); }
};

Renderer.prototype.didDestroyElement = function (view) {
  set(view, 'element', null);
  if (view._transitionTo) {
    view._transitionTo('preRender');
  }
}; // element destroyed so view.destroy shouldn't try to remove it removedFromDOM

export default EmberRenderer;
