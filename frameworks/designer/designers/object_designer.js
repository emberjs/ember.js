// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global SC */

/** @class
  This is a basic designer used for all `SC.Object`s that are created in
  design mode.
  
  FIXME: have `SC.ViewDesigner` subclass this designer.....

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.ObjectDesigner = SC.Object.extend(
/** @scope SC.ViewDesigner.prototype */ {

  /** The object managed by this designer. */
  object: null,
  
  /** The class for the design.  Set when the object is created. */
  objectClass: null,
  
  /** Set to `YES` if the object is currently selected for editing. */
  designIsSelected: NO,

  /** Set to `YES` if this particular designer should not be enabled. */
  designIsEnabled: YES,
  
  /**
    The current page.  Comes from the object.
    
    @property {SC.Page}
  */
  page: function() {
    var v = this.get('object');
    return (v) ? v.get('page') : null;
  }.property('object').cacheable(),
  
  /**
    The design controller from the page.  Comes from page
    
    @property {SC.PageDesignController}
  */
  designController: function() {
    var p = this.get('page');
    return (p) ? p.get('designController') : null ;  
  }.property('page').cacheable(),
  
  
  concatenatedProperties: ['designProperties', 'localizedProperties', 'excludeProperties'],

  // ..........................................................
  // GENERIC PROPERTIES
  // 
  // Adds support for adding generic properties to a object.  These will
  // overwrite whatever you write out using specifically supported props.
    
  // ..........................................................
  // HANDLE ENCODING OF VIEW DESIGN
  // 

  /**
    Encodes any simple properties that can just be copied from the object onto
    the coder.  This is used by encodeDesignProperties() and 
    encodeLocalizedProperties().
  */
  encodeSimpleProperties: function(props, coder) {
    var object = this.get('object'), proto = this.get('objectClass').prototype ;
    props.forEach(function(prop) {
      var val = object[prop] ; // avoid get() since we don't want to exec props
      if (val !== undefined && (val !== proto[prop])) {
        coder.encode(prop, val) ;
      }
    }, this);
  },
  

  /** 
    Array of properties that can be encoded directly.  This is an easy way to
    add support for simple properties that need to be written to the design
    without added code.  These properties will be encoded by 
    `encodeDesignProperties()`.
    
    You can add to this array in your subclasses.
  */
  designProperties: [],
  
  /*
    Array of properties specifically not displayed in the editable properties
    list
  */
  
  excludeProperties: [],
  
  
  /*
    Array of properties available to edit in greenhouse
    
  */
  editableProperties: function(){

    var con = this.get('designAttrs'), 
        obj = this.get('object'),
        ret = [],
        designProperties = this.get('designProperties'),
        excludeProperties = this.get('excludeProperties');
    if(con) con = con[0];
    for(var i in con){
      if(con.hasOwnProperty(i) && excludeProperties.indexOf(i) < 0){
        if(!SC.none(obj[i])) ret.pushObject(SC.Object.create({value: obj[i], key: i, view: obj}));
      }
    }
    designProperties.forEach(function(k){
      if(excludeProperties.indexOf(k) < 0){
        ret.pushObject(SC.Object.create({value: obj[k], key: k, view: obj}));
      }
    });
    
    return ret; 
  }.property('designProperties').cacheable(),
  
  /** 
    Invoked by a design coder to encode design properties.  The default 
    implementation invoked `encodeDesignProperties()` and
    `encodeChildViewsDesign()`.  You can override this method with your own
    additional encoding if you like.
  */
  encodeDesign: function(coder) {
    coder.set('className', SC._object_className(this.get('objectClass')));
    this.encodeDesignProperties(coder);
    return YES ;
  },

  /**
    Encodes the design properties for the object.  These properties are simply
    copied from the object onto the coder.  As an optimization, the value of 
    each property will be checked against the default value in the class. If
    they match, the property will not be emitted.
  */
  encodeDesignProperties: function(coder) {
    return this.encodeSimpleProperties(this.get('designProperties'), coder);
  },
  
  /** 
    Array of localized that can be encoded directly.  This is an easy way to
    add support for simple properties that need to be written to the 
    localization without added code.  These properties will be encoded by 
    `encodeLocalizedProperties()`.
    
    You can add to this array in your subclasses.
  */
  localizedProperties: [],
  
  /** 
    Invoked by a localization coder to encode design properties.  The default 
    implementation invoked `encodeLocalizedProperties()` and
    `encodeChildViewsLoc()`.  You can override this method with your own
    additional encoding if you like.
  */
  encodeLoc: function(coder) {
    coder.set('className', SC._object_className(this.get('objectClass')));
    this.encodeLocalizedProperties(coder);
    return YES ;
  },

  /**
    Encodes the localized properties for the object.  These properties are 
    simply copied from the object onto the coder.  As an optimization, the value 
    of  each property will be checked against the default value in the class. 
    If they match, the property will not be emitted.
  */
  encodeLocalizedProperties: function(coder) {
    return this.encodeSimpleProperties(this.get('localizedProperties'),coder);
  },

  /**
    This method is invoked when the designer is instantiated.  You can use 
    this method to reload any state saved in the object.  This method is called
    before any observers or bindings are setup to give you a chance to 
    configure the initial state of the designer.
  */
  awakeDesign: function() {},
  
  /**
    The `unknownProperty` handler will pass through to the object by default.
    This will often provide you the support you need without needing to 
    customize the Designer.  Just make sure you don't define a conflicting
    property name on the designer itself!
  */
  unknownProperty: function(key, value) {
    if (value !== undefined) {
      this.object.set(key, value);
      return value ;
    } else return this.object.get(key);
  },
  
  // ......................................
  // PRIVATE METHODS
  //
  
  init: function() {
    
    // setup design from object state...
    this.awakeDesign();
    
    // setup bindings, etc
    sc_super();
        
    // and register with designController, if defined...
    var c= this.get('designController');
    if (c) c.registerDesigner(this) ;
    
  },

  destroy: function() {
    sc_super();
    this.set('object', null); // clears the object observer...  
  },
    
  tryToPerform: function(methodName, arg1, arg2) {
    // only handle event if we are in design mode
    var page = this.object ? this.object.get('page') : null ;
    var isDesignMode = page ? page.get('needsDesigner') || page.get('isDesignMode') : NO ;

    // if we are in design mode, route event handling to the designer
    // otherwise, invoke default method.
    if (isDesignMode) {
      return sc_super();
    } else {
      return SC.Object.prototype.tryToPerform.apply(this.object, arguments);
    }
  }
}) ;

// Set default Designer for object
if (!SC.Object.Designer) SC.Object.Designer = SC.ObjectDesigner ;

// ..........................................................
// DESIGN NOTIFICATION METHODS
//
// These methods are invoked automatically on the designer class whenever it 
// is loaded.

SC.ObjectDesigner.mixin({
  /**
    Invoked whenever a designed object is loaded.  This will save the design
    attributes for later use by a designer.
  */
  didLoadDesign: function(designedObject, sourceObject, attrs) {
    designedObject.isDesign = YES ; // indicates that we need a designer.
    designedObject.designAttrs = attrs;
    //designedObject.sourceObject = sourceObject; TODO: don't need this..
  },

  /**
    Invoked whenever a location is applied to a designed object.  Saves the 
    attributes separately for use by the design object.
  */
  didLoadLocalization: function(designedObject, attrs) {
    // nothing to do for now.
  },
  
  /**
    Invoked whenver a object is created.  This will create a peer designer if 
    needed.
  */
  didCreateObject: function(object, attrs) {
    // add designer if page is in design mode
    var page = object.get('page'), design = object.constructor;
    
    if (design.isDesign && page && page.get('needsDesigner')) {
      
      // find the designer class
      var cur = design, origDesign = design;
      while(cur && !cur.Designer) cur = cur.superclass;
      var DesignerClass = (cur) ? cur.Designer : SC.Object.Designer;
      
      // next find the first superclass object that is not a design (and a real
      // class).  This is important to make sure that we can determine the 
      // real name of a object's class.
      while (design && design.isDesign) design = design.superclass;
      if (!design) design = SC.Object;
      
      object.designer = DesignerClass.create({
        object: object,
        objectClass: design,
        designAttrs: origDesign.designAttrs
        //sourceObject: origDesign.sourceObject TODO: don't need this
      });
    }
  }
  
});
