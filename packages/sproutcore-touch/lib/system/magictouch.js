// Framework for simulating touch events without a mobile device
// Trying to be compatible with
//  http://dvcs.w3.org/hg/webevents/raw-file/tip/touchevents.html
// TODO: support more of the touch API: touch{enter, leave, cancel}
var tuio = {
	cursors: [],

  // Data structure for associating cursors with objects
	_data: {},

  _touchstart:    function(touch) {
    // Create a touchstart event
    this._create_event('touchstart', touch, {});
  },

  _touchmove: function(touch) {
    // Create a touchmove event
    this._create_event('touchmove', touch, {});
  },

  _touchend: function(touch) {
    // Create a touchend event
    this._create_event('touchend', touch, {});
  },

  _create_event: function(name, touch, attrs) {
    // Creates a custom DOM event
    var evt = document.createEvent('CustomEvent');
    evt.initEvent(name, true, true);
    // Attach basic touch lists
    evt.touches = this.cursors;
    // Get targetTouches on the event for the element
    evt.targetTouches = this._get_target_touches(touch.target);
    evt.changedTouches = [touch];
    // Attach custom attrs to the event
    for (var attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        evt[attr] = attrs[attr];
      }
    }
    // Dispatch the event
    if (touch.target) {
      touch.target.dispatchEvent(evt);
    } else {
      document.dispatchEvent(evt);
    }
  },

  _get_target_touches: function(element) {
    var targetTouches = [];
    for (var i = 0; i < this.cursors.length; i++) {
      var touch = this.cursors[i];
      if (touch.target == element) {
        targetTouches.push(touch);
      }
    }
    return targetTouches;
  },

	// Callback from the main event handler
	callback: function(type, sid, fid, x, y, angle) {
    //console.log('callback type: ' + type + ' sid: ' + sid + ' fid: ' + fid);
		var data;

		if (type !== 3) {
			data = this._data[sid];
		} else {
			data = {
				sid: sid,
				fid: fid
			};
			this._data[sid] = data;
		}

    // Some properties
    // See http://dvcs.w3.org/hg/webevents/raw-file/tip/touchevents.html
    data.identifier = sid;
    data.pageX = window.innerWidth * x;
    data.pageY = window.innerHeight * y;
    data.target = document.elementFromPoint(data.pageX, data.pageY);

		switch (type) {
			case 3:
				this.cursors.push(data);
				this._touchstart(data);
				break;

			case 4:
				this._touchmove(data);
				break;

			case 5:
				this.cursors.splice(this.cursors.indexOf(data), 1);
				this._touchend(data);
				break;

			default:
				break;
		}

		if (type === 5) {
			delete this._data[sid];
		}
	}

};

window.tuio_callback = function(type, sid, fid, x, y, angle)	{
	tuio.callback(type, sid, fid, x, y, angle);
}
