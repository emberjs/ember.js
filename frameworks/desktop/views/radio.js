// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  A RadioView is used to create a group of radio buttons.  The user can use
  these buttons to pick from a choice of options.

  This view renders simulated radio buttons that can display a mixed state and
  has other features not found in platform-native controls.

  The radio buttons themselves are designed to be styled using CSS classes with
  the following structure:

      <label class="sc-radio-button">
        <img class="button" src="some_image.gif"/>
        <input type="radio" name="<sc-guid>" value=""/>
        <span class="sc-button-label">Label for button1</span>
      </label>

  Setting up a RadioView accepts a number of properties, for example:

      radio: SC.RadioView.design({
        items: [
          {
            title: "Red",
            value: "red",
            enabled: YES,
            icon: "button_red"
          },{
            title: "Green",
            value: "green",
            enabled: YES,
            icon: 'button_green'
          }
        ],
        value: 'red',
        itemTitleKey: 'title',
        itemValueKey: 'value',
        itemIconKey: 'icon',
        itemIsEnabledKey: 'enabled',
        isEnabled: YES,
        layoutDirection: SC.LAYOUT_HORIZONTAL
      })

  The items array can contain either strings, or as in the example above a
  hash. When using a hash, make sure to also specify the itemTitleKey
  and itemValueKey you are using. Similarly, you will have to provide
  itemIconKey if you are using icons radio buttons. The individual items
  enabled property is YES by default, and the icon is optional.

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.RadioView = SC.View.extend(SC.Control,
/** @scope SC.RadioView.prototype */{

  /**
    @field
    @type Boolean
    @default YES
    @observes isEnabled
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /**
    @type Array
    @default ['sc-radio-view']
    @see SC.View#classNames
  */
  classNames: ['sc-radio-view'],

  /**
    The WAI-ARIA role for a group of radio buttons.

    @type String
    @default 'radiogroup'
    @readOnly
  */
  ariaRole: 'radiogroup',

  /**
    @type Array
    @default ['displayItems', 'layoutDirection']
    @see SC.View#displayProperties
  */
  displayProperties: ['displayItems', 'layoutDirection'],

  /**
    @type String
    @default 'radioGroupRenderDelegate'
  */
  renderDelegateName: 'radioGroupRenderDelegate',

  // ..........................................................
  // Properties
  //

  /**
    If items property is a hash, specify which property will function as
    the ariaLabeledBy with this itemAriaLabeledByKey property.ariaLabeledBy is used
    as the WAI-ARIA attribute for the radio view. This property is assigned to
    'aria-labelledby' attribute, which defines a string value that labels the
    element. Used to support voiceover.  It should be assigned a non-empty string,
    if the 'aria-labelledby' attribute has to be set for the element.

    @type String
    @default null
  */
  itemAriaLabeledByKey: null,

  /**
    If items property is a hash, specify which property will function as
    the ariaLabeled with this itemAriaLabelKey property.ariaLabel is used
    as the WAI-ARIA attribute for the radio view. This property is assigned to
    'aria-label' attribute, which defines a string value that labels the
    element. Used to support voiceover.  It should be assigned a non-empty string,
    if the 'aria-label' attribute has to be set for the element.

    @type String
    @default null
  */
  itemAriaLabelKey: null,

  /**
    The value of the currently selected item, and which will be checked in the
    UI. This can be either a string or an array with strings for checking
    multiple values.

    @type Object|String
    @default null
  */
  value: null,

  /**
    This property indicates how the radio buttons are arranged. Possible values:

      - SC.LAYOUT_VERTICAL
      - SC.LAYOUT_HORIZONTAL

    @type String
    @default SC.LAYOUT_VERTICAL
  */
  layoutDirection: SC.LAYOUT_VERTICAL,

  /**
    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  /**
    The items property can be either an array with strings, or a
    hash. When using a hash, make sure to also specify the appropriate
    itemTitleKey, itemValueKey, itemIsEnabledKey and itemIconKey.

    @type Array
    @default []
  */
  items: [],

  /**
    If items property is a hash, specify which property will function as
    the title with this itemTitleKey property.

    @type String
    @default null
  */
  itemTitleKey: null,

  /**
    If items property is a hash, specify which property will function as
    the item width with this itemWidthKey property. This is only used when
    layoutDirection is set to SC.LAYOUT_HORIZONTAL and can be used to override
    the default value provided by the framework or theme CSS.

    @type String
    @default null
  */
  itemWidthKey: null,

  /**
    If items property is a hash, specify which property will function as
    the value with this itemValueKey property.

    @type String
    @default null
  */
  itemValueKey: null,

  /**
    If items property is a hash, specify which property will function as
    the value with this itemIsEnabledKey property.

    @type String
    @default null
  */
  itemIsEnabledKey: null,

  /**
    If items property is a hash, specify which property will function as
    the value with this itemIconKey property.

    @type String
    @default null
  */
  itemIconKey: null,

  /**  @private
    If the items array itself changes, add/remove observer on item...
  */
  itemsDidChange: function() {
    if (this._items) {
      this._items.removeObserver('[]', this, this.itemContentDidChange);
    }
    this._items = this.get('items');
    if (this._items) {
      this._items.addObserver('[]', this, this.itemContentDidChange);
    }
    this.itemContentDidChange();
  }.observes('items'),

  /** @private
    Invoked whenever the item array or an item in the array is changed.
    This method will regenerate the list of items.
  */
  itemContentDidChange: function() {
    // Force regeneration of buttons
    this._renderAsFirstTime = YES;

    this.notifyPropertyChange('displayItems');
  },

  // ..........................................................
  // PRIVATE SUPPORT
  //

  /** @private
    Data Sources for radioRenderDelegates, as required by radioGroupRenderDelegate.
  */
  displayItems: function() {
    var items = this.get('items'),
        viewValue = this.get('value'),
        isArray = SC.isArray(viewValue),
        loc = this.get('localize'),
        titleKey = this.get('itemTitleKey'),
        valueKey = this.get('itemValueKey'),
        widthKey = this.get('itemWidthKey'),
        isHorizontal = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL,
        isEnabledKey = this.get('itemIsEnabledKey'),
        iconKey = this.get('itemIconKey'),
        ariaLabeledByKey = this.get('itemAriaLabeledByKey'),
        ariaLabelKey = this.get('itemAriaLabelKey'),
        ret = this._displayItems || [], max = (items)? items.get('length') : 0,
        item, title, width, value, idx, isEnabled, icon, sel, active,
        ariaLabeledBy, ariaLabel;

    for(idx=0;idx<max;idx++) {
      item = items.objectAt(idx);

      // if item is an array, just use the items...
      if (SC.typeOf(item) === SC.T_ARRAY) {
        title = item[0];
        value = item[1];

        // otherwise, possibly use titleKey,etc.
      } else if (item) {
        // get title.  either use titleKey or try to convert the value to a
        // string.
        if (titleKey) {
          title = item.get ? item.get(titleKey) : item[titleKey];
        } else title = (item.toString) ? item.toString() : null;

        if (widthKey && isHorizontal) {
          width = item.get ? item.get(widthKey) : item[widthKey];
        }

        if (valueKey) {
          value = item.get ? item.get(valueKey) : item[valueKey];
        } else value = item;

        if (isEnabledKey) {
          isEnabled = item.get ? item.get(isEnabledKey) : item[isEnabledKey];
        } else isEnabled = YES;

        if (iconKey) {
          icon = item.get ? item.get(iconKey) : item[iconKey];
        } else icon = null;

        if (ariaLabeledByKey) {
          ariaLabeledBy = item.get ? item.get(ariaLabeledByKey) : item[ariaLabeledByKey];
        } else ariaLabeledBy = null;

        if (ariaLabelKey) {
          ariaLabel = item.get ? item.get(ariaLabelKey) : item[ariaLabelKey];
        } else ariaLabel = null;

        // if item is nil, use some defaults...
      } else {
        title = value = icon = null;
        isEnabled = NO;
      }

      // it can only be enabled if the radio view itself is enabled
      isEnabled = isEnabled && this.get('isEnabled');

      if (item) {
        sel = (isArray) ? (viewValue.indexOf(value) >= 0) : (viewValue === value);
      } else {
        sel = NO;
      }

      // localize title if needed
      if (loc) title = SC.String.loc(title);
      ret.push(SC.Object.create({
        title: title,
        icon: icon,
        width: width,
        value: value,

        isEnabled: isEnabled,
        isSelected: (isArray && viewValue.indexOf(value) >= 0 && viewValue.length === 1) || (viewValue === value),
        isMixed: (isArray && viewValue.indexOf(value) >= 0),
        isActive: this._activeRadioButton === idx,
        theme: this.get('theme'),
        renderState: {}
      }));
    }

    return ret; // done!
  }.property('isEnabled', 'value', 'items', 'itemTitleKey', 'itemWidthKey', 'itemValueKey', 'itemIsEnabledKey', 'localize', 'itemIconKey','itemAriaLabeledByKey', 'itemAriaLabelKey').cacheable(),

  /** @private
    If the user clicks on of the items mark it as active on mouseDown unless
    is disabled.

    Save the element that was clicked on so we can remove the active state on
    mouseUp.
  */
  mouseDown: function(evt) {
    if (!this.get('isEnabledInPane')) return YES;

    var delegate = this.get('renderDelegate'), proxy = this.get('renderDelegateProxy'),
        elem = this.$(),
        index = delegate.indexForEvent(proxy, elem, evt);

    this._activeRadioButton = index;

    if (index !== undefined) {
      var item = this.get('displayItems')[index];
      if (item.get('isEnabled')) {
        item.set('isActive', YES);
        delegate.updateRadioAtIndex(proxy, elem, index);
      }
    }

    // even if radiobuttons are not set to get firstResponder, allow default
    // action, that way textfields loose focus as expected.
    evt.allowDefault();
    return YES;
  },

  /** @private
    If we have a radio element that was clicked on previously, make sure we
    remove the active state. Then update the value if the item clicked is
    enabled.
  */
  mouseUp: function(evt) {
    if (!this.get('isEnabledInPane')) return YES;

    var delegate = this.get('renderDelegate'), proxy = this.get('renderDelegateProxy'),
        elem = this.$(),
        displayItems = this.get('displayItems'),
        index = delegate.indexForEvent(proxy, elem, evt);

    if (this._activeRadioButton !== undefined && index !== this._activeRadioButton) {
      displayItems[this._activeRadioButton].set('isActive', NO);
      delegate.updateRadioAtIndex(proxy, elem, this._activeRadioButton);
    }

    this._activeRadioButton = undefined;

    if (index !== undefined) {
      var item = this.get('displayItems')[index];
      if (item.get('isEnabled')) {
        item.set('isActive', NO);
        delegate.updateRadioAtIndex(proxy, elem, index);
        this.set('value', item.value);
      }
    }

    evt.allowDefault();
    return YES;
  },

  keyDown: function(evt) {
    if(!this.get('isEnabledInPane')) return YES;
    // handle tab key
    if (evt.which === 9 || evt.keyCode === 9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if(view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }
    if (evt.which >= 37 && evt.which <= 40){

      var delegate = this.get('renderDelegate'), proxy = this.get('renderDelegateProxy'),
          elem = this.$(),
          displayItems = this.get('displayItems'),
          val = this.get('value');
      for(var i= 0, iLen = displayItems.length; i<iLen; i++){
        if(val === displayItems[i].value) break;
      }


      if (evt.which === 37 || evt.which === 38 ){
        if(i<=0) i = displayItems.length-1;
        else i--;
      }
      if (evt.which === 39 || evt.which === 40 ){
        if(i>=displayItems.length-1) i = 0;
        else i++;
      }
      delegate.updateRadioAtIndex(proxy, elem, i);
      this.set('value', displayItems[i].value);
    }
    evt.allowDefault();

    return NO;
  },


  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  }

});
