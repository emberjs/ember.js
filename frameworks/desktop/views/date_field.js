// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Shared */

/** @class

  A Date field add behaviour to the Text Field to support date management,
  for example, disabling deletion, and special behaviour to tabs commands.

  This field view is tightly integrated with SC.DateTime

  By default the Date Field View show Date only, but if you need to show the Time do:

      dateAndTime: Shared.DateFieldView.design({
        showTime: YES,
        valueBinding: '...'
      }),

  and if you only need to show time:

      timeOnly: Shared.DateFieldView.design({
        showTime: YES,
        showDate: NO,
        valueBinding: '...'
      })

  Example usage with special format:

      specialDate: Shared.DateFieldView.design({
        formatDate: '%d %b of %Y',
        valueBinding: '...'
      }),

  You can override these format as you like, but has some limitations,
  actually only support these KEY from SC.DateTime:

  %a %b %d %H %I %j %m %M %p %S %U %W %y %Y

  These are keys that has FIXED length, so we can control the selection and tabing.

  @extends SC.TextFieldView
  @since SproutCore 1.0
  @author Juan Pablo Goldfinger
*/
SC.DateFieldView = SC.TextFieldView.extend(
/** @scope SC.DateFieldView.prototype */ {

  /**
    @type String
    @default null
  */
  value: null,

  /**
    @type Boolean
    @default YES
  */
  showDate: YES,

  /**
    @type Boolean
    @default NO
  */
  showTime: NO,

  /**
    Set this to NO to disallow the default keyboard handling, which attempts to convert
    numeric keystrokes into valid dates.

    @type Boolean
    @default YES
  */
  allowNumericInput: YES,

  /**
    @type String
    @default '%I:%M %p'
  */
  formatTime: '%I:%M %p',

  /**
    @type String
    @default '%d/%m/%Y'
  */
  formatDate: '%d/%m/%Y',

  /**
    @type String
    @default '%d/%m/%Y %I:%M %p'
  */
  formatDateTime: '%d/%m/%Y %I:%M %p',

  // DateTime constants (with fixed width, like numbers or abbs with fixed length)
  // original: '%a %A %b %B %c %d %h %H %i %I %j %m %M %p %S %U %W %x %X %y %Y %Z %%'.w(),
  // NOTE: I think that %a and %b aren't useful because is more adequate to represent day
  // with 1..31 without zeros at start, but causes the length not to be fixed)

  /** @private*/
  _dtConstants: ['%a', '%b', '%d', '%H', '%I', '%j', '%m', '%M', '%p', '%S', '%U', '%W', '%y', '%Y'],
  // Width constants for each representation %@.

  /** @private */
  _wtConstants: [3,3,2,2,2,3,2,2,2,2,2,2,2,4],

  /** @private */
  activeSelection: 0,

  /*
  FUTURE: DatePickerSupport.
  createChildViews: function() {
    sc_super();
    if (SC.browser.isWebkit) {
      // ON MOZILLA DON'T WORK
      var view = Shared.DatePickerView.extend({
        layout: { right: 0, centerY: 0, width: 18, height: 15 }
      });
      view.bind('value', [this, 'value']);
      view.bind('isVisible', [this, 'isEnabled']);
      this.set('rightAccessoryView', view);
    }
  },
  */

  /**
    The current format to apply for Validator and to show.

    @field
    @type String
    @observes showTime
    @observes showDate
  */
  format: function() {
    var st = this.get('showTime');
    var sd = this.get('showDate');
    if (st === YES && sd === YES) return this.get('formatDateTime');
    if (st === YES) return this.get('formatTime');
    return this.get('formatDate');
  }.property('showTime', 'showDate').cacheable(),

  /**
    The current validator to format the Date to the input field and vice versa.

    @field
    @type SC.Validator.DateTime
    @observes format
  */
  validator: function() {
    return SC.Validator.DateTime.extend({ format: this.get('format') });
  }.property('format').cacheable(),

  /**
    Array of Key/TextSelection found for the current format.

    @field
    @type SC.Array
  */
  tabsSelections: function() {
    var arr = [];
    var ft = this.get('format');
    var _dt = this.get('_dtConstants');
    var _wt = this.get('_wtConstants');

    // Parse the string format to retrieve and build
    // a TextSelection array ordered to support tabs behaviour
    if (SC.empty(ft)) {
      throw new Error('The format string is empty, and must be a valid string.');
    }

    var pPos, key, keyPos, startAt = 0, nPos = 0, oPos = 0;
    while(startAt < ft.length && ft.indexOf('%', startAt) !== -1) {
      pPos = ft.indexOf('%', startAt);
      key = ft.substring(pPos, pPos + 2);
      startAt = pPos + 2;

      keyPos = _dt.indexOf(key);
      if (keyPos === -1) {
        throw new Error("SC.DateFieldView: The format's key '%@' is not supported.".fmt(key));
      }
      nPos = nPos + pPos - oPos;
      arr.push(SC.Object.create({
        key: key,
        textSelection: SC.TextSelection.create({ start: nPos, end: nPos + _wt[keyPos] })
      }));
      nPos = nPos + _wt[keyPos];
      oPos = startAt;
    }
    pPos = key = keyPos = null;

    return arr;
  }.property('format').cacheable(),

  /** @private
    If the activeSelection changes or the value changes, update the "TextSelection" to show accordingly.
  */
  updateTextSelectionObserver: function() {
    var as = this.get('activeSelection');
    var ts = this.get('tabsSelections');
    if (this.get('isEditing')) {
      this.selection(null, ts[as].get('textSelection'));
    }
  }.observes('activeSelection', 'value'),

  /** @private
    Updates the value according the key.
  */
  updateValue: function(key, upOrDown) {
    // 0 is DOWN - 1 is UP
    var newValue = (upOrDown === 0) ? -1 : 1;
    var value = this.get('value'), hour;
    switch(key) {
      case '%a': case '%d': case '%j': this.set('value', value.advance({ day: newValue })); break;
      case '%b': case '%m': this.set('value', value.advance({ month: newValue })); break;
      case '%H': case '%I': this.set('value', value.advance({ hour: newValue })); break;
      case '%M': this.set('value', value.advance({ minute: newValue })); break;
      case '%p': {
        hour = value.get('hour') >= 12 ? -12 : 12;
        this.set('value', value.advance({ hour: hour }));
        break;
      }
      case '%S': this.set('value', value.advance({ second: newValue })); break;
      case '%U': this.set('value', value.advance({ week1: newValue })); break;
      case '%W': this.set('value', value.advance({ week0: newValue })); break;
      case '%y': case '%Y': this.set('value', value.advance({ year: newValue })); break;
    }
  },


  /** @private */
  _lastValue: null,

  /** @private */
  _lastKey: null,

  _selectRootElement: function() {
    // TODO: This is a solution while I don't found how we
    // receive the last key from the last input.
    // (to see if is entering with Tab or backTab)
    /*if (this.get('activeSelection') === -1) {
    }*/
  },


  // ..........................................................
  // Key Event Support
  //
  
  /** @private */
  keyDown: function(evt) {
    if (this.interpretKeyEvents(evt)) {
      evt.stop();
      return YES;
    }
    return sc_super();
  },

  /** @private */
  ctrl_a: function() {
    return YES;
  },

  /** @private */
  moveUp: function(evt) {
    var as = this.get('activeSelection');
    var ts = this.get('tabsSelections');
    this.updateValue(ts[as].get('key'), 1);
    return YES;
  },

  /** @private */
  moveDown: function(evt) {
    var as = this.get('activeSelection');
    var ts = this.get('tabsSelections');
    this.updateValue(ts[as].get('key'), 0);
    return YES;
  },

  /** @private */
  moveRight: function(evt) {
    var ts = this.get('tabsSelections');
    var ns = this.get('activeSelection') + 1;
    if (ns === ts.length) {
      ns = 0;
    }
    this.set('activeSelection', ns);
    return YES;
  },

  /** @private */
  moveLeft: function(evt) {
    var ts = this.get('tabsSelections');
    var ns = this.get('activeSelection') - 1;
    if (ns === -1) {
      ns = ts.length - 1;
    }
    this.set('activeSelection', ns);
    return YES;
  },

  /** @private */
  insertTab: function(evt) {
    var ts = this.get('tabsSelections');
    var ns = this.get('activeSelection') + 1;
    if (ns < ts.length) {
      this.set('activeSelection', ns);
      return YES;
    }
    return NO;
  },

  /** @private */
  insertBacktab: function(evt) {
    var ns = this.get('activeSelection') - 1;
    if (ns !== -1) {
      this.set('activeSelection', ns);
      return YES;
    }
    return NO;
  },

  /** @private */
  mouseUp: function(evt) {
    var ret = sc_super();
    var cs = this.get('selection');
    if (SC.none(cs)) {
      this.set('activeSelection', 0);
    } else {
      var caret = cs.get('start');
      var ts = this.get('tabsSelections');
      var _tsLen = ts.length, cts;
      for(var i=0; i<_tsLen; i++) {
        cts = ts[i].get('textSelection');
        if (caret >= cts.get('start') && caret <= cts.get('end')) {
          this.set('activeSelection', i);
        }
      }
    }
    return ret;
  },

  /** @private */
  deleteBackward: function(evt) {
    return YES;
  },

  /** @private */
  deleteForward: function(evt) {
    return YES;
  },

  /** @private */
  _numericCharacters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  /** @private */
  _nonnumericCharacters: [' ', '-', '/', ':'],
  /** @private Validates and applies supported keystrokes. */
  insertText: function(chr, evt) {
    // If it's a nonnumeric "advance" character, advance.
    // TODO: instead of having a list of possible delimiter characters, we should actually look
    // at what the next separator character is and only advance on that one.
    if (this._nonnumericCharacters.contains(chr)) this.moveRight();

    // If it's a numeric character (and we're doing those), validate and apply it.
    if (this.get('allowNumericInput') && this._numericCharacters.contains(chr)) {
      var as = this.get('activeSelection'),
          ts = this.get('tabsSelections'),
          key = ts[as].get('key');

      var value = this.get('value'),
          lastValue = this._lastValue,
          length = 2,
          min = 0, 
          max, key, newValue;

      switch(key) {
        case '%Y': 
          key = 'year';
          min = 1000;
          max = 9999;
          length = 4;
        break;
        case '%y':
          key = 'year';
          max = 99;
        break;
        case '%m':
          key = 'month';
          min = 1;
          max = 12;
        break;
        case '%d':
          key = 'day';
          min = 1;
          max = value.advance({ month: 1 }).adjust({ day: 0 }).get('day');
        break;
        case '%H':
          key = 'hour';
          max = 23;
        break;
        case '%I':
          key = 'hour';
          max = 11;
        break;
        case '%M':
          key = 'minute';
          max = 59;
        break;
        case '%S':
          key = 'second';
          max = 59;
        break;        
      }

      if (SC.none(lastValue) || this._lastKey !== key) {
        lastValue = value.get(key);
        lastValue = (lastValue < 10 ? '0' : '') + lastValue;
      }

      if (lastValue.length > length) lastValue = lastValue.substr(-length);

      // Removes the first character and adds the new one at the end of the string
      lastValue = lastValue.slice(1) + chr;
      newValue = parseInt(lastValue, 10);

      // If the value is allow, updates the value
      if (newValue <= max && newValue >= min) {
        var hash = {};
        hash[key] = newValue;

        this.set('value', value.adjust(hash, NO));
      }

      this._lastValue = lastValue;
      this._lastKey = key;
    }

    // Regardless, we handled the event.
    return YES;
  }
});
