// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class

  DEPRECATED. Use SelectView instead.

  SelectFieldView displays browser-native popup menu.  To use this view,
  you should either bake into the HTML the preset list of options, or
  you can set the -objects property to an array of items to show.  The
  value is current value of the select.

  @deprecated
  @extends SC.FieldView
  @author Charles Jolley
  @author Mike Ball
  @since SproutCore 1.0
*/
SC.SelectFieldView = SC.FieldView.extend(
/** @scope SC.SelectFieldView.prototype */ {

  /**
    @type Array
    @default ['objects','nameKey','valueKey']
    @see SC.View#displayProperties
  */
  displayProperties: ['objects','nameKey','valueKey'],

  /**
    Reflects the value of `isEnabledInPane`.

    @field
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: function() {
    return this.get('isEnabledInPane');
  }.property('isEnabledInPane'),

  /**
    @type String
    @default 'select'
    @see SC.View#tagName
  */
  tagName: 'select',

  /**
    @type Array
    @default ['sc-select-field-view']
    @see SC.View#classNames
  */
  classNames: ['sc-select-field-view'],

  /**
    An array of items that will form the menu you want to show.

    @type Array
    @default []
  */
  objects: [],

  /** @private
    Binding default for an array of objects
  */
  objectsBindingDefault: SC.Binding.multiple(),

  /**
    If you set this to a non-null value, then the name shown for each
    menu item will be pulled from the object using the named property.
    if this is null, the collection objects themselves will be used.

    @type String
    @default null
  */
  nameKey: null,

  /**
    If you set this to a non-null value, then the value of this key will
    be used to sort the objects.  If this is not set, then nameKey will
    be used.

    @type String
    @default null
  */
  sortKey: null,

  /**
     Set this to a non-null value to use a key from the passed set of objects
     as the value for the options popup.  If you don't set this, then the
     objects themselves will be used as the value.

     @type String
     @default null
  */
  valueKey: null,

  /**
    set this to non-null to place an empty option at the top of the menu.

    @type String
    @default null
  */
  emptyName: null,

  /**
    if true, the empty name will be localized.

    @type Boolean
    @default NO
  */
  localize: NO,

  /** @private
    if true, it means that the nameKey, valueKey or objects changed
  */
  cpDidChange: YES,

  /**
    if true, it means that no sorting will occur, objects will appear
    in the same order as in the array

    @type Boolean
    @default NO
  */
  disableSort: NO,

  /**
    override this to change the enabled/disabled state of menu items as they
    are built.  Return false if you want the menu item to be disabled.

    @param itemValue the value for the item to validate
    @param itemName the name of the menu item to validate
    @returns YES if the item should be enabled, NO otherwise
  */
  validateMenuItem: function(itemValue, itemName) {
    return YES;
  },

  /**
    override this method to implement your own sorting of the menu. By
    default, menu items are sorted using the value shown or the sortKey

    @param objects the unsorted array of objects to display.
    @returns sorted array of objects
  */
  sortObjects: function(objects) {
    if(!this.get('disableSort')){
      var nameKey = this.get('sortKey') || this.get('nameKey') ;
      if(nameKey) objects = objects.sortProperty(nameKey);
      else{
        objects = objects.sort(function(a,b) {
          if (nameKey) {
            a = a.get ? a.get(nameKey) : a[nameKey] ;
            b = b.get ? b.get(nameKey) : b[nameKey] ;
          }
          return (a<b) ? -1 : ((a>b) ? 1 : 0) ;
        }) ;
      }
    }
    return objects ;
  },

  /** @private */
  render: function(context, firstTime) {
    // Only re-render if it's the firstTime or if a change is required
    if (firstTime || this.get('cpDidChange')) {
      this.set('cpDidChange', NO);
      // get list of objects.
      var nameKey = this.get('nameKey') ;
      var valueKey = this.get('valueKey') ;
      var objects = this.get('objects') ;
      var fieldValue = this.get('value') ;
      var el, selectElement;

      if ( !this.get('isEnabled') ) context.setAttr('disabled','disabled');

      // get the localization flag.
      var shouldLocalize = this.get('localize');

      // convert fieldValue to guid, if it is an object.
      if (!valueKey && fieldValue) fieldValue = SC.guidFor(fieldValue) ;
      if ((fieldValue === null) || (fieldValue === '')) fieldValue = '***' ;

      if (objects) {
        objects = this.sortObjects(objects) ; // sort'em.
        // var html = [] ;
        if(!firstTime){
          selectElement=this.$input()[0];
          if (!selectElement) return;
          selectElement.innerHTML='';
        }

        var emptyName = this.get('emptyName') ;
        if (emptyName) {
          if (shouldLocalize) emptyName = SC.String.loc(emptyName);
          if(firstTime){
            context.push('<option value="***">'+emptyName+'</option>',
                          '<option disabled="disabled"></option>') ;
          }else{
            el=document.createElement('option');
            el.value="***";
            el.innerHTML=emptyName;
            selectElement.appendChild(el);
            el=document.createElement('option');
            el.disabled="disabled";
            selectElement.appendChild(el);
          }
        }

          // generate option elements.
        objects.forEach(function(object, index) {
        if (object) {
          // either get the name from the object or convert object to string.
          var name = nameKey ? (object.get ? object.get(nameKey) : object[nameKey]) : object.toString() ;

          // localize name if specified.
          if(shouldLocalize)
          {
            name = SC.String.loc(name);
          }

          // get the value using the valueKey or the object if no valueKey.
          // then convert to a string or use _guid if one of available.
          var value = (valueKey) ? (object.get ? object.get(valueKey) : object[valueKey]) : object ;
          // if there is no emptyName and no preselected value
          // then the value should be the value of the first element in the list
          if (!emptyName && index === 0 && fieldValue === '***') {
            this.set('value', value);
          }
          if (value !== null && value !== undefined) value = (SC.guidFor(value)) ? SC.guidFor(value) : value.toString() ;

          // render HTML
          var disable = (this.validateMenuItem && this.validateMenuItem(value, name)) ? '' : 'disabled="disabled" ' ;
          if(firstTime){
            context.push('<option '+disable+'value="'+value+'">'+name+'</option>') ;
          } else{
            el=document.createElement('option');
            el.value=value;
            el.innerHTML=name;
            if(disable.length>0) el.disable="disabled";
            selectElement.appendChild(el);
          }
        // null value means separator.
        } else {
          if(firstTime){
            context.push('<option disabled="disabled"></option>') ;
          }else{
            el=document.createElement('option');
            el.disabled="disabled";
            selectElement.appendChild(el);
          }
        }
      }, this );

      this.setFieldValue(fieldValue);

      } else {
        this.set('value',null);
      }
    } else {
      this.$().prop('disabled', !this.get('isEnabled'));
    }
  },

  /** @private */
  _objectsObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('objects'),

  /** @private */
  _objectArrayObserver: function() {
    this.set('cpDidChange', YES);
    this.propertyDidChange('objects');
  }.observes('*objects.[]'),

  /** @private */
  _nameKeyObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('nameKey'),

  /** @private */
  _valueKeyObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('valueKey'),

  /** @private */
  _isEnabledObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('isEnabled'),

  // .......................................
  // PRIVATE
  //

  /** @private */
  $input: function() { return this.$(); },

  /** @private */
  mouseDown: function(evt) {
    if (!this.get('isEnabledInPane')) {
      evt.stop();
      return YES;
    } else return sc_super();
  },

  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  },

  // when fetching the raw value, convert back to an object if needed...
  /** @private */
  getFieldValue: function() {
    var value = sc_super(); // get raw value...
    var valueKey = this.get('valueKey') ;
    var objects = this.get('objects') ;
    var found = null; // matching object goes here.
    var object;

    // Handle empty selection.
    if (value == '***') {
      value = null ;

    // If no value key was set and there are objects then match back to an
    // object.
    } else if (value && objects) {
      // objects = Array.from(objects) ;

      var loc = (SC.typeOf(objects.length) === SC.T_FUNCTION) ? objects.length() : objects.length;

      while(!found && (--loc >= 0)) {
        object = objects.objectAt? objects.objectAt(loc) : objects[loc] ;
        if (object === null || object === undefined) continue; // null means placeholder; just skip

        // get value using valueKey if there is one or use object
        // map to _guid or toString.
        if (valueKey) object = (object.get) ? object.get(valueKey) : object[valueKey] ;
        var ov = (object !== null && object !== undefined) ? (SC.guidFor(object) ? SC.guidFor(object) : object.toString()) : null ;

        // use this object value if it matches.
        if (value == ov) found = object ;
      }
    }

    return (valueKey || found) ? found : value;
  },

  /** @private */
  setFieldValue: function(newValue) {
    if (SC.none(newValue)) {
      newValue = '***' ;
    } else {
      newValue = ((newValue !== null && newValue !== undefined) ? (SC.guidFor(newValue) ? SC.guidFor(newValue) : newValue.toString()) : null );
    }
    this.$input().val(newValue);
    return this ;
  },

  /** @private */
  fieldDidFocus: function() {
    var isFocused = this.get('isFocused');
    if (!isFocused) this.set('isFocused', true);
  },

  /** @private */
  fieldDidBlur: function() {
    var isFocused = this.get('isFocused');
    if (isFocused) this.set('isFocused', false);
  },

  /** @private */
  _isFocusedObserver: function() {
    this.$().setClass('focus', this.get('isFocused'));
  }.observes('isFocused'),

  /** @private */
  didCreateLayer: function() {
    var input = this.$input();
    if (this.get('isEnabled') === false) this.$()[0].disabled = true;
    SC.Event.add(input, 'blur', this, this.fieldDidBlur);
    SC.Event.add(input, 'focus',this, this.fieldDidFocus);
    SC.Event.add(input, 'change',this, this._field_fieldValueDidChange);
  },

  /** @private */
  willDestroyLayer: function() {
    var input = this.$input();
    SC.Event.remove(input, 'focus', this, this.fieldDidFocus);
    SC.Event.remove(input, 'blur', this, this.fieldDidBlur);
    SC.Event.remove(input, 'change',this, this._field_fieldValueDidChange);
  }

});
