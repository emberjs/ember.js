import _default from 'ember-views/views/states/default';
import assign from 'ember-metal/assign';
import jQuery from 'ember-views/system/jquery';
import run from 'ember-metal/run_loop';
import symbol from 'ember-metal/symbol';
import isEnabled from 'ember-metal/features';

/**
@module ember
@submodule ember-views
*/

import { get } from 'ember-metal/property_get';
import { internal } from 'htmlbars-runtime';

var hasElement = Object.create(_default);

const ELEMENTS = symbol('ELEMENTS');

assign(hasElement, {
  [ELEMENTS](view) {
    let firstNode = view._renderNode.firstNode;
    let lastNode = view._renderNode.lastNode;
    let node = firstNode;
    let nodeList = [];

    function testNode(node) {
      //Skip comment nodes and empty text nodes
      return !(node.nodeType === 8 || (node.nodeType === 3 && !/\S/.test(node.nodeValue)));
    }

    //handle first node
    if (testNode(node)) { nodeList.push(node); }
    node = node.nextSibling;

    while (node && node !== lastNode) {
      if (node.nodeType !== 8) { nodeList.push(node); }
      node = node.nextSibling;
    }

    //handle last node
    if (testNode(lastNode)) { nodeList.push(lastNode); }

    return nodeList;
  },

  $(view, sel) {
    if (view.tagName === '') {
      if (isEnabled('ember-views-tagless-jquery')) {
        var range = jQuery(this[ELEMENTS](view));
        //Return inner find and topmost elements filter if a selector is provided
        return sel ? jQuery(sel, range).add(range.filter(sel)) : range;
      }
    } else {
      var elem = view.element;
      return sel ? jQuery(sel, elem) : jQuery(elem);
    }
  },

  getElement(view) {
    var parent = get(view, 'parentView');
    if (parent) { parent = get(parent, 'element'); }
    if (parent) { return view.findElementInParentElement(parent); }
    return jQuery('#' + get(view, 'elementId'))[0];
  },

  // once the view has been inserted into the DOM, rerendering is
  // deferred to allow bindings to synchronize.
  rerender(view) {
    view.renderer.ensureViewNotRendering(view);

    var renderNode = view._renderNode;

    renderNode.isDirty = true;
    internal.visitChildren(renderNode.childNodes, function(node) {
      if (node.getState().manager) {
        node.shouldReceiveAttrs = true;
      }
      node.isDirty = true;
    });

    renderNode.ownerNode.emberView.scheduleRevalidate(renderNode, view.toString(), 'rerendering');
  },

  cleanup(view) {
    view._currentState.destroyElement(view);
  },

  // once the view is already in the DOM, destroying it removes it
  // from the DOM, nukes its element, and puts it back into the
  // preRender state if inDOM.

  destroyElement(view) {
    view.renderer.remove(view, false);
    return view;
  },

  // Handle events from `Ember.EventDispatcher`
  handleEvent(view, eventName, evt) {
    if (view.has(eventName)) {
      // Handler should be able to re-dispatch events, so we don't
      // preventDefault or stopPropagation.
      return run.join(view, view.trigger, eventName, evt);
    } else {
      return true; // continue event propagation
    }
  },

  invokeObserver(target, observer) {
    observer.call(target);
  }
});

export default hasElement;
