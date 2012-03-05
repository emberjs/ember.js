var get = Ember.get, getPath = Ember.getPath;

require("ember-data/system/model/model");

DS.Model.reopenClass({
  attributes: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAttribute) { map.set(name, meta); }
    });

    return map;
  }).cacheable(),

  processAttributeKeys: function() {
    if (this.processedAttributeKeys) { return; }

    var namingConvention = getPath(this, 'proto.namingConvention');

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAttribute && !meta.options.key) {
        meta.options.key = namingConvention.keyToJSONKey(name, this);
      }
    }, this);
  }
});

DS.attr = function(type, options) {
  var transform = DS.attr.transforms[type];
  ember_assert("Could not find model attribute of type " + type, !!transform);

  var transformFrom = transform.from;
  var transformTo = transform.to;

  options = options || {};

  var meta = {
    type: type,
    isAttribute: true,
    options: options,

    // this will ensure that the key always takes naming
    // conventions into consideration.
    key: function(recordType) {
      recordType.processAttributeKeys();
      return options.key;
    }
  };

  return Ember.computed(function(key, value) {
    var data;

    key = meta.key(this.constructor);

    if (arguments.length === 2) {
      value = transformTo(value);
      this.setProperty(key, value);
    } else {
      data = get(this, 'data');
      value = get(data, key);

      if (value === undefined) {
        value = options.defaultValue;
      }
    }

    return transformFrom(value);
  // `data` is never set directly. However, it may be
  // invalidated from the state manager's setData
  // event.
  }).property('data').cacheable().meta(meta);
};

DS.attr.transforms = {
  string: {
    from: function(serialized) {
      return Ember.none(serialized) ? null : String(serialized);
    },

    to: function(deserialized) {
      return Ember.none(deserialized) ? null : String(deserialized);
    }
  },

  number: {
    from: function(serialized) {
      return Ember.none(serialized) ? null : Number(serialized);
    },

    to: function(deserialized) {
      return Ember.none(deserialized) ? null : Number(deserialized);
    }
  },

  'boolean': {
    from: function(serialized) {
      return Boolean(serialized);
    },

    to: function(deserialized) {
      return Boolean(deserialized);
    }
  },

  date: {
    from: function(serialized) {
      var type = typeof serialized;

      if (type === "string" || type === "number") {
        return new Date(serialized);
      } else if (serialized === null || serialized === undefined) {
        // if the value is not present in the data,
        // return undefined, not null.
        return serialized;
      } else {
        return null;
      }
    },

    to: function(date) {
      if (date instanceof Date) {
        var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        var pad = function(num) {
          return num < 10 ? "0"+num : ""+num;
        };

        var utcYear = date.getUTCFullYear(),
            utcMonth = date.getUTCMonth(),
            utcDayOfMonth = date.getUTCDate(),
            utcDay = date.getUTCDay(),
            utcHours = date.getUTCHours(),
            utcMinutes = date.getUTCMinutes(),
            utcSeconds = date.getUTCSeconds();


        var dayOfWeek = days[utcDay];
        var dayOfMonth = pad(utcDayOfMonth);
        var month = months[utcMonth];

        return dayOfWeek + ", " + dayOfMonth + " " + month + " " + utcYear + " " +
               pad(utcHours) + ":" + pad(utcMinutes) + ":" + pad(utcSeconds) + " GMT";
      } else if (date === undefined) {
        return undefined;
      } else {
        return null;
      }
    }
  }
};

