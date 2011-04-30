// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ........................................................................
// ObserverSet
//

/**
  @namespace

  This private class is used to store information about obversers on a
  particular key.  Note that this object is not observable.  You create new
  instances by calling SC.beget(SC.ObserverSet) ;

  @private
  @since SproutCore 1.0
*/
SC.ObserverSet = {

  /**
    Adds the named target/method observer to the set.  The method must be
    a function, not a string.

    Note that in debugging mode only, this method is overridden to also record
    the name of the object and function that resulted in the target/method
    being added.
  */
  add: function(target, method, context) {
    var targetGuid = SC.guidFor(target), methodGuid = SC.guidFor(method);
    var targets = this._members, members = this.members;

    // get the set of methods
    var indexes = targets[targetGuid];
    if ( !indexes ) indexes = targets[targetGuid] = {};

    if (indexes[methodGuid] === undefined) indexes[methodGuid] = members.length;
    else return;

    members.push([target, method, context]);
  },

  /**
    removes the named target/method observer from the set.  If this is the
    last method for the named target, then the number of targets will also
    be reduced.

    returns YES if the items was removed, NO if it was not found.
  */
  remove: function(target, method) {
    var targetGuid = SC.guidFor(target), methodGuid = SC.guidFor(method);
    var indexes = this._members[targetGuid], members = this.members;

    if( !indexes ) return false;

    var index = indexes[methodGuid];
    if ( index === undefined) return false;

    if (index !== members.length - 1) {
      var entry = (members[index] = members[members.length - 1]);
      this._members[SC.guidFor(entry[0])][SC.guidFor(entry[1])] = index;
    }

    members.pop();
    delete this._members[targetGuid][methodGuid];

    return true;
  },

  /**
    Invokes the target/method pairs in the receiver.  Used by SC.RunLoop
    Note: does not support context
  */
  invokeMethods: function() {
    var members = this.members, member;

    for( var i=0, l=members.length; i<l; i++ ) {
      member = members[i];

      // method.call(target);
      member[1].call(member[0]);
    }
  },

  /**
    Returns a new instance of the set with the contents cloned.
  */
  clone: function() {
    var newSet = SC.ObserverSet.create(), memberArray = this.members;

    newSet._members = SC.clone(this._members);
    var newMembers = newSet.members;

    for( var i=0, l=memberArray.length; i<l; i++ ) {
      newMembers[i] = SC.clone(memberArray[i]);
      newMembers[i].length = 3;
    }

    return newSet;
  },

  /**
    Creates a new instance of the observer set.
  */
  create: function() {
    return new SC.ObserverSet.constructor();
  },

  getMembers: function() {
    return this.members.slice(0);
  },

  constructor: function() {
    this._members = {};
    this.members = [];
  }

} ;
SC.ObserverSet.constructor.prototype = SC.ObserverSet;
SC.ObserverSet.slice = SC.ObserverSet.clone ;

