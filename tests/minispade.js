// This is based on minispade but is modified

if (typeof document !== "undefined") {
  (function() {
    minispade = {
      modules: {},
      loaded: {},

      require: function(name) {
        var loaded = minispade.loaded[name];
        var mod = minispade.modules[name];

        if (!loaded) {
          if (mod) {
            minispade.loaded[name] = true;
            mod();
          } else {
            throw "The module '" + name + "' could not be found";
          }
        }

        return loaded;
      },

      register: function(name, callback) {
        minispade.modules[name] = callback;
      }
    };
  })();
}
