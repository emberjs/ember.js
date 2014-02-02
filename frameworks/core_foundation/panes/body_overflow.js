/**
  SC.bodyOverflowArbitrator is a central object responsible for controlling the overflow on the body element.

  Use it from views that would otherwise set the body overflow style directly; call requestHidden to ask for
  the body to have overflow:hidden, and call requestVisible to ask for the body to be visible.

  Call withdrawRequest to register that you no longer have any interest in the body overflow setting. Don't
  forget to do this, or your object could be affecting the body overflow long after it's no longer relevant.

  When calling requestHidden, requestVisible, and withdrawRequest, pass your object as the first argument so
  that its request can be associated with its GUID.

  When calling requestHidden or requestVisible, you may optionally pass true as a second argument to signify
  that your desire for hidden or visible overflow is important. An important visible-request will override
  any other, but an important hidden-request will override a normal visible-request. A normal visible-request
  will in turn override a normal hidden-request.
*/
SC.bodyOverflowArbitrator = SC.Object.create(/**@scope SC.bodyOverflowArbitrator.prototype */{
  /** Request that the body be given overflow:hidden;. Pass your object, then (optionally) true to confer importance. */
  requestHidden: function (from, important) { this._makeRequest(from, -1 - 9 * !!important); },

  /** Request that the body be given overflow:visible;. Pass your object, then (optionally) true to confer importance. */
  requestVisible: function (from, important) { this._makeRequest(from, 1 + 9 * !!important); },

  /** State that your object no longer cares about the body overflow. */
  withdrawRequest: function (from) {
    // Fast path!
    if (!from) return;

    var guid = SC.guidFor(from),
      currentRequest = this._requests[guid];

    if (currentRequest) {
      delete this._requests[guid];
      this.setOverflow();
    }
  },

  /** Perform the action of setting the overflow depending on what requests are currently registered. Does nothing if there are no requests. */
  setOverflow: function () {
    var overflow = this._decideOverflow();

    if (overflow !== undefined) document.body.style.overflow = overflow ? "auto" : "hidden";
    // console.log("Body Overflow Arbitrator now decides "+(overflow===undefined?"that overflow is unimportant.":"to use overflow:"+(overflow===true?'visible':"hidden")+";")+" Requests are:",this._requests);
  },

  /** @private */
  _makeRequest: function (from, value) {
    // Fast path!
    if (!from) return;

    var guid = SC.guidFor(from),
      currentRequest = this._requests[guid];

    if (currentRequest != value) {
      this._requests[guid] = value;
      this.setOverflow();
    }
  },

  /** @private */
  _requests: {},

  /** @private */
  _decideOverflow: function () {
    var haveHidden, haveVisible, haveImportantHidden, haveImportantVisible,
        reqs = this._requests, req;

    for (var i in reqs) {
      if ((req = reqs[i]) < 0) haveHidden = YES;
      if (req < -1) haveImportantHidden = YES;
      if (req > 0) haveVisible = YES;
      if (req > 1) haveImportantVisible = YES;
    }
    if (haveImportantVisible) return YES;              //important-visible takes all.
    if (haveVisible && haveImportantHidden) return NO; //important-hidden beats regular-visible.
    if (haveVisible) return YES;                       //regular-visible beats regular-hidden
    if (haveHidden) return NO;                         //if there is a hidden, it can win now.

    return undefined;                                  //if nobody cared, return undefined to prevent work.
  }
});
