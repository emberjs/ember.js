// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

SC.StatechartSequenceMatcher = SC.Object.extend({
  
  statechartMonitor: null,
  
  match: null,
  
  MISMATCH: {},
  
  begin: function() {
    this._stack = [];
    this.beginSequence();
    this._start = this._stack[0];
    return this;
  },
  
  end: function() {
    this.endSequence();
    
    if (this._stack.length > 0) {
      throw new Error("can not match sequence. sequence matcher has been left in an invalid state");
    }
    
    var monitor = this.statechartMonitor,
        result = this._matchSequence(this._start, 0) === monitor.sequence.length;

    this.set('match', result);
    
    return result;
  },
  
  entered: function() {
    this._addStatesToCurrentGroup('entered', arguments);
    return this;
  },
  
  exited: function() {
    this._addStatesToCurrentGroup('exited', arguments);
    return this;
  },
  
  beginConcurrent: function() {
    var group = {
      type: 'concurrent',
      values: []
    };
    if (this._peek()) this._peek().values.push(group);
    this._stack.push(group);
    return this;
  },
  
  endConcurrent: function() {
    this._stack.pop();
    return this;
  },
  
  beginSequence: function() {
    var group = {
      type: 'sequence',
      values: []
    };
    if (this._peek()) this._peek().values.push(group);
    this._stack.push(group);
    return this;
  },
  
  endSequence: function() {
    this._stack.pop();
    return this;
  },
  
  _peek: function() {
    var len = this._stack.length;
    return len === 0 ? null : this._stack[len - 1];
  },
  
  _addStatesToCurrentGroup: function(action, states) {
    var group = this._peek(), len = states.length, i = 0;
    for (; i < len; i += 1) {
      group.values.push({ action: action, state: states[i] });
    }
  },
  
  _matchSequence: function(sequence, marker) {
    var values = sequence.values, 
        len = values.length, 
        i = 0, val,
        monitor = this.statechartMonitor;
        
    if (len === 0) return marker;
    if (marker > monitor.sequence.length) return this.MISMATCH;
        
    for (; i < len; i += 1) {
      val = values[i];
      
      if (val.type === 'sequence') {
        marker = this._matchSequence(val, marker);
      } else if (val.type === 'concurrent') {
        marker = this._matchConcurrent(val, marker);
      } else if (!this._matchItems(val, monitor.sequence[marker])){
        return this.MISMATCH;
      } else {
        marker += 1;
      }
      
      if (marker === this.MISMATCH) return this.MISMATCH;
    }
    
    return marker;
  },

  // A
  // B (concurrent [X, Y])
  //   X
  //     M
  //     N
  //   Y
  //     O
  //     P
  // C
  // 
  // 0 1  2 3 4   5 6 7  8
  //      ^       ^
  // A B (X M N) (Y O P) C
  //      ^       ^
  // A B (Y O P) (X M N) C
  
  _matchConcurrent: function(concurrent, marker) {
    var values = SC.clone(concurrent.values), 
        len = values.length, 
        i = 0, val, tempMarker = marker, match = false,
        monitor = this.statechartMonitor;
        
    if (len === 0) return marker;
    if (marker > monitor.sequence.length) return this.MISMATCH;
    
    while (values.length > 0) {
      for (i = 0; i < len; i += 1) {
        val = values[i];
      
        if (val.type === 'sequence') {
          tempMarker = this._matchSequence(val, marker);
        } else if (val.type === 'concurrent') {
          tempMarker = this._matchConcurrent(val, marker);
        } else if (!this._matchItems(val, monitor.sequence[marker])){
          tempMarker = this.MISMATCH;
        } else {
          tempMarker = marker + 1;
        }
      
        if (tempMarker !== this.MISMATCH) break;
      }
      
      if (tempMarker === this.MISMATCH) return this.MISMATCH;
      values.removeAt(i);
      len = values.length;
      marker = tempMarker;
    }
    
    return marker;
  },
  
  _matchItems: function(matcherItem, monitorItem) {
    if (!matcherItem || !monitorItem) return false;
  
    if (matcherItem.action !== monitorItem.action) {
      return false;
    }
    
    if (SC.typeOf(matcherItem.state) === SC.T_OBJECT && matcherItem.state === monitorItem.state) {
      return true;      
    }
    
    if (matcherItem.state === monitorItem.state.get('name')) {
      return true;
    }
  
    return false;
  }
  
});