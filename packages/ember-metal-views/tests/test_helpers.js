import { Renderer } from "ember-metal-views";

var renderer;

function MetalRenderer () {
  MetalRenderer._super.call(this);
}
MetalRenderer._super = Renderer;
MetalRenderer.prototype = Object.create(Renderer.prototype, {
  constructor: {
    value: MetalRenderer,
    enumerable: false,
    writable: true,
    configurable: true
  }
});

MetalRenderer.prototype.childViews = function (view) {
  return view.childViews;
};
MetalRenderer.prototype.willCreateElement = function(view) {
};
MetalRenderer.prototype.createElement = function (view, contextualElement) {
  var el;
  if (view.element) {
    el = view.element;
  } else {
    el = view.element = this._dom.createElement(view.tagName || 'div');
  }
  var classNames = view.classNames;
  if (typeof classNames === 'string') {
    el.setAttribute('class', classNames);
  } else if (classNames && classNames.length) {
    if (classNames.length === 1) { // PERF: avoid join'ing unnecessarily
      el.setAttribute('class', classNames[0]);
    } else {
      el.setAttribute('class', classNames.join(' ')); // TODO: faster way to do this?
    }
  }
  var attributeBindings = view.attributeBindings;
  if (attributeBindings && attributeBindings.length) {
    for (var i=0,l=attributeBindings.length; i<l; i++) {
      var attributeBinding = attributeBindings[i];
      var parts = attributeBinding.split(':');
      el.setAttribute(parts[1], view[parts[0]]);
    }
  }
  if (view.childViews) {
    view._childViewsMorph = this._dom.createMorph(el, null, null);
  } else if (view.textContent) {
    setElementText(el, view.textContent);
  } else if (view.innerHTML) {
    var nodes = this._dom.parseHTML(view.innerHTML, el);
    while (nodes[0]) {
      el.appendChild(nodes[0]);
    }
  }
  return el;
};
MetalRenderer.prototype.didCreateElement = function(view) {
};
MetalRenderer.prototype.willInsertElement = function(view) {
  if (view.willInsertElement) {
    view.willInsertElement();
  }
};
MetalRenderer.prototype.didInsertElement = function(view) {
  if (view.didInsertElement) {
    view.didInsertElement();
  }
};

MetalRenderer.prototype.scheduleRender = function (renderer, render) {
  render.call(renderer);
};

export function testsFor(name, options) {
  QUnit.module(name, {
    setup: function() {
      renderer = new MetalRenderer();
      if (options && options.setup) { options.setup(renderer); }
    },
    teardown: function() {
      if (options && options.teardown) { options.teardown(renderer); }
      renderer = undefined;
    }
  });
}

export function subject() {
  return renderer;
}

var supportsTextContent = ('textContent' in document.createElement('div'));
var setElementText;
if (supportsTextContent) {
  setElementText = function setElementText(element, text) {
    element.textContent = text;
  };
} else {
  setElementText = function setElementText(element, text) {
    element.innerText = text;
  };
}
export {setElementText};

export function equalHTML(element, expectedHTML, message) {
  var html;
  if (typeof element === 'string') {
    html = document.getElementById(element).innerHTML;
  } else {
    if (element instanceof window.NodeList) {
      var fragment = document.createElement('div');
      while (element[0]) {
        fragment.appendChild(element[0]);
      }
      html = fragment.innerHTML;
    } else {
      html = element.outerHTML;
    }
  }

  var actualHTML = html.replace(/ id="[^"]+"/gmi, '');
  actualHTML = actualHTML.replace(/<\/?([A-Z]+)/gi, function(tag){
    return tag.toLowerCase();
  });
  actualHTML = actualHTML.replace(/\r\n/gm, '');
  actualHTML = actualHTML.replace(/ $/, '');
  equal(actualHTML, expectedHTML, message || "HTML matches");
}

export function appendTo(view) {
  renderer.appendTo(view, document.getElementById('qunit-fixture'));
  return view.element;
}
