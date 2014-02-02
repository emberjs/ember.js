// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/*global ViewBuilder */
sc_require('views/high_light');
/** @class

  A Designer class provides the core editing functionality you need to edit
  a view in the UI.  When your app loads in `design.mode`, a peer Designer
  instance is created for every view using the class method Designer or
  `SC.ViewDesigner` if the view class does not define a Designer class.

  Whenever you put your app into design mode, all events will be routed first
  to the peer designer for an object, which will have an opportunity to
  prosent a design UI.

  Likewise, the designer palettes provided by the view builder will focus on
  the designer instead of the view itself.

  ## Designer UI

  The basic ViewDesigner class automatically handles the UI interaction for
  layout.  You can also double click on the view to perform a default action.

  For views with `isContainerView` set to `YES`, double clicking on the view will
  automatically "focus" the view.  This allows you to select the view's
  children instead of the view itself.

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.ViewDesigner = SC.Object.extend(
/** @scope SC.ViewDesigner.prototype */ {

  /** The view managed by this designer. */
  view: null,

  /** The class for the design.  Set when the view is created. */
  viewClass: null,

  /** Set to YES if the view is currently selected for editing. */
  designIsSelected: NO,

  /** Set to YES if this particular designer should not be enabled. */
  designIsEnabled: YES,

  /**
    The current page.  Comes from the view.

    @property {SC.Page}
  */
  page: function() {
    var v = this.get('view');
    return (v) ? v.get('page') : null;
  }.property('view').cacheable(),

  /**
    The design controller from the page.  Comes from page

    @property {SC.PageDesignController}
  */
  designController: function() {
    var p = this.get('page');
    return (p) ? p.get('designController') : null ;
  }.property('page').cacheable(),

  /**
    If set to NO, the default childView encoding will not run.  You can use
    this option, for example, if your view creates its own childViews.

    Alternatively, you can override the `encodeChildViewsDesign()` and
    `encodeChildViewsLoc()` methods.

    @type Boolean
  */
  encodeChildViews: YES,

  concatenatedProperties: ['designProperties', 'localizedProperties', 'excludeProperties'],


  // ..........................................................
  // SIZE AND POSITIONING SUPPORT
  //

  /**
    Set to `NO` to hide horizontal resize handles
  */
  canResizeHorizontal: YES,

  /**
    Set to `NO` to resize vertical handles
  */
  canResizeVertical: YES,

  /**
    Allows moving.
  */
  canReposition: YES,

  /**
    Determines the minimum allowed width
  */
  minWidth: 10,

  /**
    Determines the minimum allowed height
  */
  minHeight: 10,

  /**
    Determines maximum allowed width.  `null` means no limit
  */
  maxWidth: 100000000,

  /**
    Determines maximum allowed height.  `null` means no limit
  */
  maxHeight: 100000000,

  /**
    Returns the current layout for the view.  Set this property to update
    the layout.  Direct properties are exposed a well. You will usually want
    to work with those instead.

    @property
    @type {Hash}
  */
  layout: function(key, value) {
    var view = this.get('view');
    if (!view) return null;

    if (value !== undefined) view.set('layout', value);
    return view.get('layout');
  }.property('view').cacheable(),

  /**
    The current anchor location.  This determines which of the other dimension
    metrics are actually used to compute the layout.  The value may be one of:

       TOP_LEFT, TOP_CENTER, TOP_RIGHT, TOP_HEIGHT,
       CENTER_LEFT, CENTER_CENTER, CENTER_RIGHT, CENTER_HEIGHT
       BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT, BOTTOM_HEIGHT,
       WIDTH_LEFT, WIDTH_CENTER, WIDTH_RIGHT, WIDTH_HEIGHT,
       null

    @property
    @type {Number}
  */
  anchorLocation: function(key, value) {
    var layout = this.get('layout'),
        K      = SC.ViewDesigner,
        h, v, frame, view, pview, pframe, ret;

    if (!layout) return null;

    // update to refelct new anchor locations...
    if (value !== undefined) {

      ret    = {};
      view   = this.get('view');
      frame  = view.get('frame');
      pview  = view.get('parentView');
      pframe = pview ? pview.get('frame') : null;
      if (!pframe) pframe = SC.RootResponder.responder.computeWindowSize();

      // compute new layout in each direction
      if (value & K.ANCHOR_LEFT) {
        ret.left = frame.x;
        ret.width = frame.width;

      } else if (value & K.ANCHOR_RIGHT) {
        ret.right = (pframe.width - SC.maxX(frame));
        ret.width = frame.width;

      } else if (value & K.ANCHOR_CENTERX) {
        ret.centerX = Math.round(SC.midX(frame) - (pframe.width/2)) ;
        ret.width = frame.width;

      } else if (value & K.ANCHOR_WIDTH) {
        ret.left = frame.x;
        ret.right = (pframe.width - SC.maxX(frame));
      }

      // vertical
      if (value & K.ANCHOR_TOP) {
        ret.top = frame.y;
        ret.height = frame.height;

      } else if (value & K.ANCHOR_BOTTOM) {
        ret.bottom = (pframe.height - SC.maxY(frame));
        ret.height = frame.height;

      } else if (value & K.ANCHOR_CENTERY) {
        ret.centerY = Math.round(SC.midY(frame) - (pframe.height/2)) ;
        ret.height = frame.height;

      } else if (value & K.ANCHOR_HEIGHT) {
        ret.top = frame.y;
        ret.bottom = (pframe.height - SC.maxY(frame));
      }

      this.set('layout', ret);
      layout = ret ;
    }

    if (!SC.none(layout.left)) {
      h = SC.none(layout.width) ? K.ANCHOR_WIDTH : K.ANCHOR_LEFT;
    } else if (!SC.none(layout.right)) h = K.ANCHOR_RIGHT;
    else if (!SC.none(layout.centerX)) h = K.ANCHOR_CENTERX;
    else h = 0;

    if (!SC.none(layout.top)) {
      v = SC.none(layout.height) ? K.ANCHOR_HEIGHT : K.ANCHOR_TOP;
    } else if (!SC.none(layout.bottom)) v = K.ANCHOR_BOTTOM ;
    else if (!SC.none(layout.centerY)) v = K.ANCHOR_CENTERY ;
    else v = 0;

    return v | h;
  }.property('layout').cacheable(),

  _layoutProperty: function(key, value) {
    var layout = this.get('layout');
    if (!layout) return null;

    if (!SC.none(layout) && (value !== undefined)) {
      layout = SC.copy(layout);
      layout[key] = value;
      this.set('layout', layout);
    }

    return layout[key];
  },

  /**
    Returns the top offset of the current layout or `null` if not defined
  */
  layoutTop: function(key, value) {
    return this._layoutProperty('top', value);
  }.property('layout').cacheable(),

  /**
    Returns the bottom offset of the current layout or `null` if not defined
  */
  layoutBottom: function(key, value) {
    return this._layoutProperty('bottom', value);
  }.property('layout').cacheable(),

  /**
    Returns the centerY offset of the current layout or `null` if not defined
  */
  layoutCenterY: function(key, value) {
    return this._layoutProperty('centerY', value);
  }.property('layout').cacheable(),

  /**
    Returns the height offset of the current layout or null if not defined
  */
  layoutHeight: function(key, value) {
    return this._layoutProperty('height', value);
  }.property('layout').cacheable(),

  /**
    Returns the top offset of the current layout or `null` if not defined
  */
  layoutTop: function(key, value) {
    return this._layoutProperty('top', value);
  }.property('layout').cacheable(),

  /**
    Returns the left offset of the current layout or `null` if not defined
  */
  layoutLeft: function(key, value) {
    return this._layoutProperty('left', value);
  }.property('layout').cacheable(),

  /**
    Returns the right offset of the current layout or `null` if not defined
  */
  layoutRight: function(key, value) {
    return this._layoutProperty('right', value);
  }.property('layout').cacheable(),

  /**
    Returns the centerX offset of the current layout or `null` if not defined
  */
  layoutCenterX: function(key, value) {
    return this._layoutProperty('centerX', value);
  }.property('layout').cacheable(),

  /**
    Returns the width offset of the current layout or `null` if not defined
  */
  layoutWidth: function(key, value) {
    return this._layoutProperty('width', value);
  }.property('layout').cacheable(),

  // ..........................................................
  // GENERIC PROPERTIES
  //
  // Adds support for adding generic properties to a view.  These will
  // overwrite whatever you write out using specifically supported props.

  // ..........................................................
  // HANDLE ENCODING OF VIEW DESIGN
  //

  /**
    Encodes any simple properties that can just be copied from the view onto
    the coder.  This is used by `encodeDesignProperties()` and
    `encodeLocalizedProperties()`.
  */
  encodeSimpleProperties: function(props, coder) {
    var view = this.get('view'), proto = this.get('viewClass').prototype ;
    props.forEach(function(prop) {
      var val = view[prop] ; // avoid get() since we don't want to exec props

      //handle bindings
      if (prop.length > 7 && prop.slice(-7) === "Binding" && val !== undefined){
        coder.js(prop,val.encodeDesign());
      }
      else{
        if (val !== undefined && (val !== proto[prop])) {
          coder.encode(prop, val) ;
        }
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
  designProperties: ['layout', 'isVisible', 'isEnabled', 'styleClass'],


  /*
    Array of properties specifically not displayed in the editable properties
    list
  */

  excludeProperties: ['layout', 'childViews'],


  /*
    Array of properties available to edit in greenhouse

  */
  editableProperties: function(){

    var con = this.get('designAttrs'),
        view = this.get('view'),
        ret = [],
        designProperties = this.get('designProperties'),
        excludeProperties = this.get('excludeProperties');
    if(con) con = con[0];
    for(var i in con){
      if(con.hasOwnProperty(i) && excludeProperties.indexOf(i) < 0){
        if(!SC.none(view[i])) ret.pushObject(SC.Object.create({value: view[i], key: i, view: view}));
      }
    }
    designProperties.forEach(function(k){
      if(excludeProperties.indexOf(k) < 0){
        ret.pushObject(SC.Object.create({value: view[k], key: k, view: view}));
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
    coder.set('className', SC._object_className(this.get('viewClass')));
    this.encodeDesignProperties(coder);
    this.encodeDesignAttributeProperties(coder);
    this.encodeChildViewsDesign(coder);
    return YES ;
  },

  /**
    Encodes the design properties for the view.  These properties are simply
    copied from the view onto the coder.  As an optimization, the value of
    each property will be checked against the default value in the class. If
    they match, the property will not be emitted.
  */
  encodeDesignProperties: function(coder) {
    return this.encodeSimpleProperties(this.get('designProperties'), coder);
  },


  encodeDesignAttributeProperties: function(coder){
    var designProps = this.get('designProperties'),
        designAttrs = this.get('designAttrs'),
        simpleProps = [];

    if(designAttrs) designAttrs = designAttrs[0];

    for(var attr in designAttrs){
      if(designAttrs.hasOwnProperty(attr) && designProps.indexOf(attr) < 0 && attr !== 'childViews'){
        simpleProps.push(attr);
      }
    }
    return this.encodeSimpleProperties(simpleProps, coder);
  },

  /**
    Encodes the design for child views.  The default implementation loops
    through child views.  If you store your child views elsewhere in your
    config (for example as named properties), then you may want to override
    this method with your own encoding.
  */
  encodeChildViewsDesign: function(coder) {
    if (!this.get('encodeChildViews')) return;
    var view = this.view, childViews = view.get('childViews');
    if (childViews.length>0) coder.object('childViews', childViews);
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
    coder.set('className', SC._object_className(this.get('viewClass')));
    this.encodeLocalizedProperties(coder);
    this.encodeChildViewsLoc(coder);
    return YES ;
  },

  /**
    Encodes the localized properties for the view.  These properties are
    simply copied from the view onto the coder.  As an optimization, the value
    of  each property will be checked against the default value in the class.
    If they match, the property will not be emitted.
  */
  encodeLocalizedProperties: function(coder) {
    return this.encodeSimpleProperties(this.get('localizedProperties'),coder);
  },

  /**
    Encodes the design for child views.  The default implementation loops
    through child views.  If you store your child views elsewhere in your
    config (for example as named properties), then you may want to override
    this method with your own encoding.
  */
  encodeChildViewsLoc: function(coder) {
    if (!this.get('encodeChildViews')) return;
    var view = this.view, childViews = view.childViews;
    if (childViews.length>0) coder.object('childViews', childViews);
  },

  /**
    This method is invoked when the designer is instantiated.  You can use
    this method to reload any state saved in the view.  This method is called
    before any observers or bindings are setup to give you a chance to
    configure the initial state of the designer.
  */
  awakeDesign: function() {},


  /**
    over-ride this method in your designers to customize drop operations
    default just calls appendChild

    TODO: Come up with a better name for this method.
  */
  addView: function(view){
    this.view.appendChild(view);
  },

  // ..........................................................
  // VIEW RELAYING
  //
  // View property changes relay automatically...

  /**
    Invoked whenever the view changes.  This will observe all property
    changes on the new view.
  */
  viewDidChange: function() {
    var view = this.get('view'), old = this._designer_view ;
    if (view === old) return; // nothing to do

    var func = this.viewPropertyDidChange ;
    if (old) old.removeObserver('*', this, func);
    this._designer_view = view ;
    if (view) view.addObserver('*', this, func);
    this.viewPropertyDidChange(view, '*', null, null);
  }.observes('view'),

  /**
    Invoked whenever a property on the view has changed.  The passed key will
    be '*' when the entire view has changed.  The default implementation here
    will notify the property as changed on the receiver if the
    property value is undefined on the receiver.

    It will notify all properties changed for '*'.  You may override this
    method with your own behavior if you like.
  */
  viewPropertyDidChange: function(view, key) {
    if (key === '*') this.allPropertiesDidChange();
    else if (this[key] === undefined) this.notifyPropertyChange(key) ;

    if ((key === '*') || (key === 'layout')) {
      if (this.get('designIsSelected') && this._handles) {
        this._handles.set('layout', SC.clone(view.get('layout')));
      }
    }
  },

  /**
    The `unknownProperty` handler will pass through to the view by default.
    This will often provide you the support you need without needing to
    customize the Designer.  Just make sure you don't define a conflicting
    property name on the designer itself!
  */
  unknownProperty: function(key, value) {
    if (value !== undefined) {
      this.view.set(key, value);
      return value ;
    } else return this.view.get(key);
  },

  // ......................................
  // PRIVATE METHODS
  //

  init: function() {

    // setup design from view state...
    this.awakeDesign();

    // setup bindings, etc
    sc_super();

    // now add observer for property changes on view to relay change out.
    this.viewDidChange();

    // and register with designController, if defined...
    var c= this.get('designController');
    if (c) c.registerDesigner(this) ;

  },

  destroy: function() {
    sc_super();
    this.set('view', null); // clears the view observer...
  },

  designIsSelectedDidChange: function() {
    if (SC.kindOf(this.view, SC.Pane)) return this ;

    var isSel = this.get('designIsSelected');
    var handles = this._handles;

    if (isSel) {

      if (!handles) {
        handles = this._handles = SC.SelectionHandlesView.create({
          designer: this
        });
      }

      var parent = this.view.get('parentView');
      if (!handles.get('parentView') !== parent) parent.appendChild(handles);
      handles.set('layout', this.view.get('layout'));
    } else if (handles) {
      if (handles.get('parentView')) handles.removeFromParent();
    }
  }.observes('designIsSelected'),

  tryToPerform: function(methodName, arg1, arg2) {
    // only handle event if we are in design mode
    var page = this.view ? this.view.get('page') : null ;
    var isDesignMode = page ? page.get('needsDesigner') || page.get('isDesignMode') : NO ;

    // if we are in design mode, route event handling to the designer
    // otherwise, invoke default method.
    if (isDesignMode) {
      return sc_super();
    } else {
      return SC.Object.prototype.tryToPerform.apply(this.view, arguments);
    }
  },

  // ..........................................................
  // DRAWING SUPPORT
  //

  /**
    Update the layer to add any design-specific marking
  */
  didCreateLayer: function() {},

  /**
    Update the layer to add any design-specific marking
  */
  didUpdateLayer: function() {},

  /**
    Update the layer to add any design-specific marking
  */
  willDestroyLayer: function() {},

  // ..........................................................
  // ROOT DESIGNER SUPPORT
  //

  parentDesignerIsRoot: function(){
    var dc = this.get('designController'), view = this.get('view');
    return dc.get('rootDesigner') === view.getPath('parentView.designer');
  }.property(),

  /**
    set this property to `YES` if you want your designer to become Root
  */
  acceptRootDesigner: NO,

  isRootDesigner: NO,

  isRootDesignerDidChange: function() {

    var isRoot = this.get('isRootDesigner'),
        highLight = this._highLight;

    if (isRoot && this.get('designIsEnabled')) {

      if (!highLight) {
        highLight = this._highLight = SC.RootDesignerHighLightView.create({
          designer: this
        });
      }

      var parent = this.view.get('parentView');
      highLight.set('targetFrame', this.view.get('frame'));

      if (!highLight.get('parentView') !== parent) parent.insertBefore(highLight,this.view);
    }
    else if (highLight) {
      if (highLight.get('parentView')) highLight.removeFromParent();
    }
  }.observes('isRootDesigner'),

  resignRootDesigner: function(){
    var prevRoot = this.get('prevRootDesigner');
    if(this.get('isRootDesigner') && prevRoot){
      var dc = this.get('designController');
      if(dc) dc.makeRootDesigner(prevRoot);
    }
  },

  shouldReleaseRootDesigner: function(evt){
    var frame = this.view.get('frame');
    if(this.get('isRootDesigner') && !SC.pointInRect({ x: evt.pageX, y: evt.pageY }, frame)){
      this.resignRootDesigner();
      return YES;
    }
    return NO;
  },

  // ..........................................................
  // MOUSE HANDLING
  //

  HANDLE_MARGIN: 10,

  /**
    Select on `mouseDown`.  If `metaKey` or `shiftKey` is pressed, add to
    selection.  Otherwise just save starting info for dragging
  */
  mouseDown: function(evt) {
    this.shouldReleaseRootDesigner(evt);
    if (!this.get('designIsEnabled') || !this.get('parentDesignerIsRoot')) return NO ;

    // save mouse down info
    var view = this.get('view'),
        info, vert, horiz, repos, frame, pview, margin, canH, canV;

    if (!view) return NO; // nothing to do

    // save mouse down state for later use
    this._mouseDownInfo = info = {
      layout:   SC.copy(view.get('layout')),
      selected: this.get('designIsSelected'),
      dragged:  NO,
      metaKey:  evt.metaKey || evt.shiftKey,
      source:   this,
      x: evt.pageX, y: evt.pageY
    };
    info.hanchor = info.vanchor = info.reposition = NO;

    // detect what operations are available.
    repos = this.get('canReposition');
    horiz = vert = NO ;
    if (info.selected) {
      frame = view.get('frame');
      pview = view.get('parentView');
      if (frame && pview) frame = pview.convertFrameToView(frame, null);

      margin = this.HANDLE_MARGIN;

      // detect if we are in any hotzones
      if (frame) {
        if (Math.abs(info.x - SC.minX(frame)) <= margin) {
          horiz = "left";
        } else if (Math.abs(info.x - SC.maxX(frame)) <= margin) {
          horiz = "right";
        }

        if (Math.abs(info.y - SC.minY(frame)) <= margin) {
          vert = "top";
        } else if (Math.abs(info.y - SC.maxY(frame)) <= margin) {
          vert = "bottom";
        }
      }

      canH = this.get('canResizeHorizontal');
      canV = this.get('canResizeVertical');

      // look for corners if can resize in both directions...
      if (canH && canV) {
        if (!vert || !horiz) vert = horiz = NO ;

      // if can only resize horizonal - must be in middle vertical
      } else if (canH) {
        vert = NO ;
        if (Math.abs(info.y - SC.midY(frame)) > margin) horiz = NO;

      // if can only resize vertical - must be in middle horizontal
      } else if (canV) {
        horiz = NO ;
        if (Math.abs(info.x - SC.midX(frame)) > margin) vert = NO ;

      // otherwise, do not allow resizing
      } else horiz = vert = NO ;
    }

    // now save settings...
    if (horiz) info.hanchor = horiz ;
    if (vert) info.vanchor = vert ;
    if (!horiz && !vert && repos) info.reposition = YES ;

    // if not yet selected, select item immediately.  This way future events
    // will be handled properly
    if (!info.selected) {
      this.get('designController').select(this, info.metaKey);
    }

    // save initial info on all selected items
    if (info.reposition) this.get('designController').prepareReposition(info);

    return YES ;
  },

  prepareReposition: function(info) {
    var view = this.get('view'),
        layout = view ? SC.copy(view.get('layout')) : {};
    info[SC.keyFor('layout', SC.guidFor(this))] = layout;
    return this ;
  },

  /**
    mouse dragged will resize or reposition depending on the settings from
    mousedown.
  */
  mouseDragged: function(evt) {
    if (!this.get('designIsEnabled') || !this.get('parentDesignerIsRoot')) return NO ;
    var info = this._mouseDownInfo,
        view = this.get('view'),
        layout, startX, startY;
    //do some binding!!!
    if(evt.altKey && SC._Greenhouse){
      startX = evt.pageX;
      startY = evt.pageY;

      var dragLink = SC.DrawingView.create({
        layout: {left: 0, top: 0, right: 0, bottom: 0},
        startPoint: {x: startX, y: startY},
        endPoint: {x: startX, y: startY},
        // private update
        _pointsDidChange: function(){
          var sp = this.get('startPoint'),
              ep = this.get('endPoint'),
              xDiff, yDiff, newLink;

          xDiff = Math.abs(sp.x - ep.x);
          yDiff = Math.abs(sp.y - ep.y);
          if (xDiff > 5 || yDiff > 5){
            newLink = {};
            newLink.shape = SC.LINE;
            newLink.start = {x: sp.x, y: sp.y};
            newLink.end = {x: ep.x, y: ep.y};
            newLink.style = { color: 'green', width: 3 };
            this.setIfChanged('shapes', [newLink]);
          }
        }.observes('startPoint', 'endPoint')
      });
      SC.designPage.get('designMainPane').appendChild(dragLink);

      SC.Drag.start({
        event: evt,
        source: this,
        dragLink: dragLink,
        dragView: SC.View.create({ layout: {left: 0, top: 0, width: 0, height: 0}}),
        ghost: NO,
        slideBack: YES,
        dataSource: this,
        anchorView: view
      });
    }
    //normal drag
    else{
      if (view && (info.hanchor || info.vanchor)) {
        layout = SC.copy(this.get('layout'));
        if (info.hanchor) this._mouseResize(evt, info, this.HKEYS, layout);
        if (info.vanchor) this._mouseResize(evt, info, this.VKEYS, layout);
        this.set('layout', layout);

      } else if (info.reposition) {
        this.get('designController').repositionSelection(evt, info);
      }
    }

  },

  // ..........................................................
  // Drag source and drag data source
  //
  dragDataTypes: ['SC.Binding'],

  dragDataForType: function(drag, dataType) {
    return dataType === 'SC.Binding' ? this.get('view') : null;
  },

  /**
    On `mouseUp` potentially change selection and cleanup.
  */
  mouseUp: function(evt) {
    if (!this.get('designIsEnabled') || !this.get('parentDesignerIsRoot')) return NO ;

    var info = this._mouseDownInfo;

    // if selected on mouse down and we didn't do any dragging, then deselect.
    if (info.selected && !info.dragged) {

      // is the mouse still inside the view?  If not, don't do anything...
      var view = this.get('view'),
          frame = view ? view.get('frame') : null,
          pview = view.get('parentView');

      if (frame && pview) frame = pview.convertFrameToView(frame, null);

      if (!frame || SC.pointInRect({ x: evt.pageX, y: evt.pageY }, frame)) {
        var controller = this.get('designController');
        if (info.metaKey) controller.deselect(this);
        else controller.select(this, NO);
      }
    }
    //double click
    if(SC._Greenhouse && evt.clickCount === 2){
      var dc = this.get('designController');
      if(this.acceptRootDesigner && dc) {
        dc.makeRootDesigner(this);
      }
      else{
        //TODO: [MB] decide if this is the functionality I want...
        SC._Greenhouse.sendAction('openInspector', view);
      }
    }

    this._mouseDownInfo = null;

    return YES ;
  },

  /**
    Called by `designerController` to reposition the view
  */
  mouseReposition: function(evt, info) {
    var layout = SC.copy(this.get('layout'));
    this._mouseReposition(evt, info, this.HKEYS, layout);
    this._mouseReposition(evt, info, this.VKEYS, layout);
    this.set('layout', layout);
    return this;
  },

  HKEYS: {
    evtPoint: "pageX",
    point:    "x",
    min:      "minWidth",
    max:      "maxWidth",
    head:     "left",
    tail:     "right",
    center:   "centerX",
    size:     "width",
    anchor:   "hanchor"
  },

  VKEYS: {
    evtPoint: "pageY",
    point:    "y",
    min:      "minHeight",
    max:      "maxHeight",
    head:     "top",
    tail:     "bottom",
    center:   "centerY",
    size:     "height",
    anchor:   "vanchor"
  },

  /**
    Generic resizer.  Must pass one set of keys: VKEYS, HKEYS
  */
  _mouseResize: function(evt, info, keys, ret) {

    var delta  = evt[keys.evtPoint] - info[keys.point],
        layout = info.layout,
        view   = this.get('view'),
        min    = this.get(keys.min),
        max    = this.get(keys.max),

        headKey   = keys.head,
        tailKey   = keys.tail,
        centerKey = keys.center,
        sizeKey   = keys.size,

        hasHead   = !SC.none(layout[keys.head]),
        hasTail   = !SC.none(layout[keys.tail]),
        hasCenter = !SC.none(layout[keys.center]),
        hasSize   = !SC.none(layout[keys.size]),
        w;

    if (info[keys.anchor] === headKey) {

      // if left aligned, adjust left size and width if set.
      if (hasHead) {
        if (hasSize) {
          w = layout[sizeKey];
          ret[sizeKey] = Math.min(max, Math.max(min, Math.floor(layout[sizeKey] - delta)));
          min = (layout[headKey]+w) - min;
          max = (layout[headKey]+w) - max;

          ret[headKey] = Math.max(max, Math.min(min, Math.floor(layout[headKey]+delta)));

        } else {
          ret[headKey] = Math.floor(layout[headKey]+delta);
        }

      // if right aligned or centered, adjust the width...
      } else if (hasTail || hasCenter) {
        if (hasCenter) delta *= 2;
        ret[sizeKey] = Math.max(min, Math.min(max, Math.floor((layout[sizeKey]||0)-delta)));

      // otherwise, adjust left
      } else ret[headKey] = Math.floor((layout[headKey]||0)+delta);

    } else if (info[keys.anchor] === tailKey) {

      // reverse above
      if (hasTail) {

        if (hasSize) {
          w = layout[sizeKey];
          ret[sizeKey] = Math.min(max, Math.max(min, Math.floor(layout[sizeKey] + delta)));
          min = (layout[tailKey]+w)-min;
          max = (layout[tailKey]+w)-max;

          ret[tailKey] = Math.max(max, Math.min(min, Math.floor(layout[tailKey]-delta)));

        } else {
          ret[tailKey] = Math.floor(layout[tailKey]-delta);
        }

      } else {
        if (hasCenter) delta *= 2;
        ret[sizeKey] = Math.max(min, Math.min(max, Math.floor((layout[sizeKey]||0)+delta)));
      }
    }

    return this;
  },

  _mouseReposition: function(evt, info, keys, ret) {
    var delta  = evt[keys.evtPoint] - info[keys.point],
        layout = info[SC.keyFor('layout', SC.guidFor(this))],
        view   = this.get('view'),

        headKey   = keys.head,
        tailKey   = keys.tail,
        centerKey = keys.center,
        sizeKey   = keys.size,

        hasHead   = !SC.none(layout[headKey]),
        hasTail   = !SC.none(layout[tailKey]),
        hasCenter = !SC.none(layout[centerKey]),
        hasSize   = !SC.none(layout[sizeKey]),
        w;

    // auto-widths can't be repositioned
    if (hasHead && hasTail && !hasSize) return NO ;

    // left/top aligned, just adjust top/left location
    if (hasHead) {
      ret[headKey] = layout[headKey]+delta;

    // right/bottom aligned, adjust bottom/right location
    } else if (hasTail) {
      ret[tailKey] = layout[tailKey]-delta;

    } else if (hasCenter) {
      ret[centerKey] = layout[centerKey]+delta;

    } else ret[headKey] = (layout[headKey]||0)+delta;

    return YES ;
  },

  // ..........................................................
  // Drag data source (for binding lines)
  //
  /**
    This method must be overridden for drag operations to be allowed.
    Return a bitwise OR'd mask of the drag operations allowed on the
    specified target.  If you don't care about the target, just return a
    constant value.

    @param {SC.View} dropTarget The proposed target of the drop.
    @param {SC.Drag} drag The SC.Drag instance managing this drag.

  */
  dragSourceOperationMaskFor: function(drag, dropTarget) {
    return SC.DRAG_LINK;
  },

  /**
    This method is called when the drag begins. You can use this to do any
    visual highlighting to indicate that the receiver is the source of the
    drag.

    @param {SC.Drag} drag The Drag instance managing this drag.

    @param {Point} loc The point in *window* coordinates where the drag
      began.  You can use convertOffsetFromView() to convert this to local
      coordinates.
  */
  dragDidBegin: function(drag, loc) {
  },

  /**
    This method is called whenever the drag image is moved.  This is
    similar to the `dragUpdated()` method called on drop targets.

    @param {SC.Drag} drag The Drag instance managing this drag.

    @param {Point} loc  The point in *window* coordinates where the drag
      mouse is.  You can use convertOffsetFromView() to convert this to local
      coordinates.
  */
  dragDidMove: function(drag, loc) {
    var dragLink = drag.dragLink;
    var endX, endY, pv, frame, globalFrame;
    if (dragLink) {
      // if using latest SproutCore 1.0, loc is expressed in browser window coordinates
      pv = dragLink.get('parentView');
      frame = dragLink.get('frame');
      globalFrame = pv ? pv.convertFrameToView(frame, null) : frame;
      if (globalFrame) {
        endX = loc.x - globalFrame.x;
        endY = loc.y - globalFrame.y;
        dragLink.set('endPoint', {x: endX , y: endY});
      }
    }
  },

  /**
    This method is called when the drag ended. You can use this to do any
    cleanup.  The operation is the actual operation performed on the drag.

    @param {SC.Drag} drag The drag instance managing the drag.

    @param {Point} loc The point in WINDOW coordinates where the drag
      ended.

    @param {DragOp} op The drag operation that was performed. One of
      SC.DRAG_COPY, SC.DRAG_MOVE, SC.DRAG_LINK, or SC.DRAG_NONE.

  */
  dragDidEnd: function(drag, loc, op) {
    var dragLink = drag.dragLink;
    if (dragLink) dragLink.destroy();
  }
}) ;

// Set default Designer for view
if (!SC.View.Designer) SC.View.Designer = SC.ViewDesigner ;

// ..........................................................
// DESIGN NOTIFICATION METHODS
//
// These methods are invoked automatically on the designer class whenever it
// is loaded.

SC.ViewDesigner.mixin({

  ANCHOR_LEFT:    0x0001,
  ANCHOR_RIGHT:   0x0002,
  ANCHOR_CENTERX: 0x0004,
  ANCHOR_WIDTH:   0x0010,

  ANCHOR_TOP:     0x0100,
  ANCHOR_BOTTOM:  0x0200,
  ANCHOR_CENTERY: 0x0400,
  ANCHOR_HEIGHT:  0x1000,

  /**
    Invoked whenever a designed view is loaded.  This will save the design
    attributes for later use by a designer.
  */
  didLoadDesign: function(designedView, sourceView, attrs) {
    designedView.isDesign = YES ; // indicates that we need a designer.
    designedView.designAttrs = attrs;
    //designedView.sourceView = sourceView; TODO: not sure we need this...
  },

  /**
    Invoked whenever a location is applied to a designed view.  Saves the
    attributes separately for use by the design view.
  */
  didLoadLocalization: function(designedView, attrs) {
    // nothing to do for now.
  },

  /**
    Invoked whenver a view is created.  This will create a peer designer if
    needed.
  */
  didCreateView: function(view, attrs) {
    // add designer if page is in design mode
    var page = view.get('page'), design = view.constructor;

    if (design.isDesign && page && page.get('needsDesigner')) {

      // find the designer class
      var cur = design, origDesign = design;
      while(cur && !cur.Designer) cur = cur.superclass;
      var DesignerClass = (cur) ? cur.Designer : SC.View.Designer;

      // next find the first superclass view that is not a design (and a real
      // class).  This is important to make sure that we can determine the
      // real name of a view's class.
      while (design && design.isDesign) design = design.superclass;
      if (!design) design = SC.View;

      view.designer = DesignerClass.create({
        view: view,
        viewClass: design,
        designAttrs: origDesign.designAttrs
        //sourceView: origDesign.sourceView TODO: not sure we need this...
      });
    }
  }

});


// ..........................................................
// FIXUP SC.View
//

SC.View.prototype._orig_respondsTo = SC.View.prototype.respondsTo;
SC.View.prototype._orig_tryToPerform = SC.View.prototype.tryToPerform;
SC.View.prototype._orig_createLayer = SC.View.prototype.createLayer;
SC.View.prototype._orig_updateLayer = SC.View.prototype.updateLayer;
SC.View.prototype._orig_destroyLayer = SC.View.prototype.destroyLayer;

/**
  If the view has a designer, then patch respondsTo...
*/
/*SC.View.prototype.respondsTo = function( methodName ) {
  var ret = !!(SC.typeOf(this[methodName]) === SC.T_FUNCTION);
  if (this.designer) ret = ret || this.designer.respondsTo(methodName);
  return ret ;
} ;*/
SC.View.prototype.respondsTo = function( methodName ) {
  if (this.designer) {
    var ret = !!(SC.typeOf(this[methodName]) === SC.T_FUNCTION);
    ret = ret || this.designer.respondsTo(methodName);
    return ret;
  }
  else {
    return this._orig_respondsTo(methodName);
  }
};

/**
  If the view has a designer, give it an opportunity to handle an event
  before passing it on to the main view.
*/
/*SC.View.prototype.tryToPerform = function(methodName, arg1, arg2) {
  if (this.designer) {
    return this.designer.tryToPerform(methodName, arg1, arg2);
  } else {
    return this._orig_respondsTo(methodName) && this[methodName](arg1, arg2);
  }
} ;*/
SC.View.prototype.tryToPerform = function(methodName, arg1, arg2) {
  if (this.designer) {
    return this.designer.tryToPerform(methodName, arg1, arg2);
  }
  else {
    return this._orig_tryToPerform(methodName, arg1, arg2);
  }
};


/*
  If the view has a designer, also call designers didCreateLayer method to
  allow drawing.
*/
SC.View.prototype.createLayer = function() {
  var ret = this._orig_createLayer.apply(this, arguments);
  if (this.designer) this.designer.didCreateLayer();
  return ret ;
};

/*
  If the view has a designer, also call the designer's didUpdateLayer method
  to allow drawing.
*/
SC.View.prototype.updateLayer = function() {
  var ret = this._orig_updateLayer.apply(this, arguments);
  if (this.designer) this.designer.didUpdateLayer();
  return ret ;
};

/**
  If the view has a designer, also call the designers willDestroyLayer
  method.
*/
SC.View.prototype.destroyLayer = function() {
  if (this.designer) this.designer.willDestroyLayer();
  return this._orig_destroyLayer.apply(this, arguments);
};
