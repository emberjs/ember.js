import Renderer from 'ember-metal-views/renderer';
import { create } from 'ember-metal/platform';
import renderBuffer from "ember-views/system/render_buffer";
import { Morph } from "morph";
import run from "ember-metal/run_loop";
import { set } from "ember-metal/property_set";

function EmberRenderer() {
  EmberRenderer.super.call(this);
}
EmberRenderer.super = Renderer;
EmberRenderer.prototype = Object.create(Renderer.prototype, {
  constructor: {
    value: EmberRenderer,
    enumerable: false,
    writable: true,
    configurable: true
  }
});

var BAD_TAG_NAME_TEST_REGEXP = /[^a-zA-Z0-9\-]/;
var BAD_TAG_NAME_REPLACE_REGEXP = /[^a-zA-Z0-9\-]/g;

function stripTagName(tagName) {
  if (!tagName) {
    return tagName;
  }

  if (!BAD_TAG_NAME_TEST_REGEXP.test(tagName)) {
    return tagName;
  }

  return tagName.replace(BAD_TAG_NAME_REPLACE_REGEXP, '');
}

EmberRenderer.prototype.scheduleRender =
  function EmberRenderer_scheduleRender(ctx, fn) {
    return run.scheduleOnce('render', ctx, fn);
  };

EmberRenderer.prototype.cancelRender =
  function EmberRenderer_cancelRender(id) {
    run.cancel(id);
  };

EmberRenderer.prototype.createChildViewsMorph =
  function EmberRenderer_createChildViewsMorph(view, _element) {
    if (view.createChildViewsMorph) {
      return view.createChildViewsMorph(_element);
    }
    var element = _element;
    if (view.isVirtual) {
      if (view._morph) {
        view._childViewsMorph = view._morph;
      } else {
        element = document.createDocumentFragment();
        var start = document.createTextNode('');
        var end = document.createTextNode('');
        element.appendChild(start);
        element.appendChild(end);
        view._childViewsMorph = new Morph(element, start, end);
      }
    } else {
      view._childViewsMorph = new Morph(element, null, null);
    }
    return element;
  };

EmberRenderer.prototype.createElement =
  function EmberRenderer_createElement(view) {
    // If this is the top-most view, start a new buffer. Otherwise,
    // create a new buffer relative to the original using the
    // provided buffer operation (for example, `insertAfter` will
    // insert a new buffer after the "parent buffer").
    var tagName = view.tagName;
    if (tagName === null || tagName === undefined) {
      tagName = 'div';
    }
    var buffer = view.buffer = renderBuffer(tagName);

    if (view.beforeRender) {
      view.beforeRender(buffer);
    }

    if (!view.isVirtual) {
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

    if (view.isContainer) {
      this.createChildViewsMorph(view, element);
    }

    view.buffer = null;
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
  if (view.transitionTo) {
    view.transitionTo('inBuffer');
  }
}; // inBuffer
Renderer.prototype.didCreateElement = function (view) {
  if (view.transitionTo) {
    view.transitionTo('hasElement');
  }
}; // hasElement
Renderer.prototype.willInsertElement = function (view) {
  if (view.trigger) { view.trigger('willInsertElement'); }
}; // will place into DOM
Renderer.prototype.didInsertElement = function (view) {
  if (view.transitionTo) {
    view.transitionTo('inDOM');
  }
  if (view.trigger) { view.trigger('didInsertElement'); }
}; // inDOM // placed into DOM
Renderer.prototype.willRemoveElement = function (view) {
  // removed from DOM  willDestroyElement currently paired with didInsertElement
  if (view.trigger) { view.trigger('willDestroyElement'); }
};
Renderer.prototype.willDestroyElement = function (view) {
  // willClearRender (currently balanced with render) this is now paired with createElement
  if (view.trigger) { view.trigger('willClearRender'); }
};
Renderer.prototype.didDestroyElement = function (view) {
  set(view, 'element', null);
  if (view.transitionTo) {
    view.transitionTo('preRender');
  }
}; // element destroyed so view.destroy shouldn't try to remove it removedFromDOM

export default EmberRenderer;
