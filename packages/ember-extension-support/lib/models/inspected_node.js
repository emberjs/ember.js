import Component from 'ember-views/views/component';
import { get } from 'ember-metal/property_get';
import EmberAttrMorph from  'ember-htmlbars/morphs/attr-morph';
const { keys } = Object;

/**
  Wraps a render node to provide debugging API for external services
  such as the Ember Inspector.

  Ideally public methods on this class should completely hide
  the internal implementations of render nodes.

  @public
  @class InspectedNode
  @param {Object} renderNode The Htmlbars render node
  @param {Object} parent The parent InspectedNode instance
 */
function InspectedNode(renderNode, parent) {
  this._renderNode = renderNode;
  this.parent = parent;
}

InspectedNode.prototype =  {
  /**
    Useful for subclassing.

    @property constructor
    @type {Function}
    @public
   */
  constructor: InspectedNode,

  /**
    The render node we are representing and adding
    debugging functionality to.

    This property is set upon creation of the instance.

    @property _renderNode
    @type {Object}
    @private
   */
  _renderNode: null,

  /**
    The parent inspected node. This property is set
    when building the a node's children. This allows
    us to walk upward in the render hierarchy.

    @property parent
    @type {InspectedNode}
    @public
   */
  parent: null,

  /**
    Fetches the render node's children and returns
    an array of InspectedNode instances (an instance is created
    for each child).

    Consecutive calls to this method do not return the same
    instances (each call creates new instances). This is why
    the method name is `buildChildren` as opposed to `getChildren`.

    @method buildChildren
    @return {Array} array of inspected nodes wrapping the render node's children.
    @public
   */
  buildChildren() {
    let children = this._getChildRenderNodes() || [];
    return children.map(renderNode => new this.constructor(renderNode, this))
    .filter(inspectedNode => inspectedNode._isInspectable());
  },

  /**
    Skip non-inspectable render nodes such as
    attr morphs.

    @private
    @method _isInspectable
    @return {Boolean}
   */
  _isInspectable() {
    return !(this._renderNode instanceof EmberAttrMorph);
  },

  /**
    Gather the children assigned to the render node.

    @private
    @method _getChildRenderNodes
    @return {Array} children renderNodes
    @public
   */
  _getChildRenderNodes() {
    if (this._renderNode.morphMap) {
      // each helper
      return keys(this._renderNode.morphMap).map(key => this._renderNode.morphMap[key]);
    } else {
      return this._renderNode.childNodes;
    }
  },


  /**
    Not all nodes are actually views/components.
    Nodes can be attributes for example. This method allows
    us to identify component nodes.

    Not to be confused with `isEmberComponent`. `Ember.View` instances
    also return `true`.

    @method  isComponentNode
    @return {Boolean}
    @public
   */
  isComponentNode() {
    return !!this._renderNode.state.manager;
  },

  /**
    Check if a node has its own controller (as opposed to sharing
    its parent's controller).

    Useful to identify route views from other views. Views that have
    their own controller are shown by default in the Ember Inspector
    view tree.

    @method hasOwnController
    @return {Boolean}
    @public
   */
  hasOwnController() {
    return !this.parent || (this.getController() !== this.parent.getController());
  },

  /**
    Check if the node has a view or component instance.
    Virtual nodes don't have a view/component instance.

    @method hasComponentInstance
    @return {Boolean}
    @public
   */
  hasComponentInstance() {
    return !!this.getComponentInstance();
  },

  /**
    Return a node's view/component instance.

    @method getComponentInstance
    @return {Ember.View|Ember.Component}
    @public
   */
  getComponentInstance() {
    return this._renderNode.emberView;
  },

  /**
    Returns the node's controller.

    @method getController
    @return {Ember.Controller}
    @public
   */
  getController() {
    return this._renderNode.lastResult && this._renderNode.lastResult.scope.locals.controller.value();
  },

  /**
    Get the node's template name. Relies on an htmlbars
    feature that adds the module name as a meta property
    to compiled templates.

    When compiling a template, pass the template's name
    as a the `moduleName` property on the options argument.
    This should be done automatically by tools that pre-compile
    templates (ex: ember-cli does this in version >= 0.2.4)

    @method getTemplateName
    @return {String} The template name
    @public
   */
  getTemplateName() {
    let template = this._renderNode.lastResult && this._renderNode.lastResult.template;
    if (template && template.meta && template.meta.moduleName) {
      return template.meta.moduleName.replace(/\.hbs$/, '');
    }
  },

  /**
    Returns whether the node is an Ember.Component or not.
    *Not* to be confused with `isComponent` which returns true
    for both views and components.

    @return {Boolean}
    @public
   */
  isEmberComponent() {
    let componentInstance = this.getComponentInstance(this._renderNode);
    return !!(componentInstance && (componentInstance instanceof Component));
  },

  /**
    The node's model. If the view has a controller,
    it will be the controller's `model` property.

    @return {Object} the model
    @public
   */
  getModel() {
    let controller = this.getController();
    if (controller) {
      return get(controller, 'model');
    }
  },

  /**
    The name of the component/view instance.

    @return {String}
    @public
   */
  getComponentInstanceName() {
    let name;
    let componentInstance = this.getComponentInstance();
    if (componentInstance) {
      // Has a component instance - take the component's name
      name = get(componentInstance, '_debugContainerKey');
      if (name) {
        name = name.replace(/.*(view|component):/, '').replace(/:$/, '');
      }
      return name;
    }
  },

  /**
    The node's name. Should be anything that the user
    can use to identity what node we are talking about.

    Usually either the view instance name, or the template name.

    @return {String} The node's name
    @public
   */
  getName() {
    let name;
    let componentInstanceName = this.getComponentInstanceName();
    if (componentInstanceName) {
      name = componentInstanceName;
      // If application view was not defined, it uses a `toplevel` view
      if (name === 'toplevel') {
        name = 'application';
      }
    } else {
      // Virtual - no component/view instance
      let templateName = this.getTemplateName();
      if (templateName) {
        name = templateName.replace(/^.*templates\//, '').replace(/\//g, '.');
      }
    }
    return name;
  },

  /**
    Get the node's bounding client rect.
    Can be used to get the node's position.

    @return {DOMRect}
    @public
   */
  getBoundingClientRect() {
    let range = document.createRange();
    range.setStartBefore(this._renderNode.firstNode);
    range.setEndAfter(this._renderNode.lastNode);
    return range.getBoundingClientRect();
  }
};

export default InspectedNode;
