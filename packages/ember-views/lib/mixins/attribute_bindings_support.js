import { Mixin } from "ember-metal/mixin";
import AttrNode from "ember-views/attr_nodes/attr_node";
import { defineProperty } from "ember-metal/properties";
import { canSetNameOnInputs } from "ember-views/system/platform";
import { read } from "ember-metal/streams/utils";
import { set } from "ember-metal/property_set";

var EMPTY_ARRAY = [];

var AttributeBindingsSupport = Mixin.create({
  concatenatedProperties: ['attributeBindings'],

  /**
    A list of properties of the view to apply as attributes. If the property is
    a string value, the value of that string will be applied as the attribute.

    ```javascript
    // Applies the type attribute to the element
    // with the value "button", like <div type="button">
    Ember.View.extend({
      attributeBindings: ['type'],
      type: 'button'
    });
    ```

    If the value of the property is a Boolean, the name of that property is
    added as an attribute.

    ```javascript
    // Renders something like <div enabled="enabled">
    Ember.View.extend({
      attributeBindings: ['enabled'],
      enabled: true
    });
    ```

    @property attributeBindings
  */
  attributeBindings: EMPTY_ARRAY,

  _unspecifiedAttributeBindings: null,

  /**
    Iterates through the view's attribute bindings, sets up observers for each,
    then applies the current value of the attributes to the passed render buffer.

    @method _applyAttributeBindings
    @param {Ember.RenderBuffer} buffer
    @param {Array} attributeBindings
    @private
  */
  _applyAttributeBindings(buffer) {
    var attributeBindings = this.attributeBindings;

    if (!attributeBindings || !attributeBindings.length) { return; }

    var unspecifiedAttributeBindings = this._unspecifiedAttributeBindings = this._unspecifiedAttributeBindings || {};

    var binding, colonIndex, property, attrName, attrNode, attrValue;
    var i, l;
    for (i=0, l=attributeBindings.length; i<l; i++) {
      binding = attributeBindings[i];
      colonIndex = binding.indexOf(':');
      if (colonIndex === -1) {
        property = binding;
        attrName = binding;
      } else {
        property = binding.substring(0, colonIndex);
        attrName = binding.substring(colonIndex + 1);
      }

      Ember.assert('You cannot use class as an attributeBinding, use classNameBindings instead.', attrName !== 'class');

      if (property in this) {
        attrValue = this.getStream('view.'+property);
        attrNode = new AttrNode(attrName, attrValue);
        this.appendAttr(attrNode, buffer);
        if (!canSetNameOnInputs && attrName === 'name') {
          buffer.attr('name', read(attrValue));
        }
      } else {
        unspecifiedAttributeBindings[property] = attrName;
      }
    }

    // Lazily setup setUnknownProperty after attributeBindings are initially applied
    this.setUnknownProperty = this._setUnknownProperty;
  },

  /**
    We're using setUnknownProperty as a hook to setup attributeBinding observers for
    properties that aren't defined on a view at initialization time.

    Note: setUnknownProperty will only be called once for each property.

    @method setUnknownProperty
    @param key
    @param value
    @private
  */
  setUnknownProperty: null, // Gets defined after initialization by _applyAttributeBindings

  _setUnknownProperty(key, value) {
    var attrName = this._unspecifiedAttributeBindings && this._unspecifiedAttributeBindings[key];

    defineProperty(this, key);

    if (attrName) {
      var attrValue = this.getStream('view.'+key);
      var attrNode = new AttrNode(attrName, attrValue);
      this.appendAttr(attrNode);
    }
    return set(this, key, value);
  }
});

export default AttributeBindingsSupport;
