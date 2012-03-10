/*globals BenchWarmer:true jQuery Benchmark*/

BenchWarmer = function(emberPath, logger, profile) {
  this.emberPath = emberPath;
  this.profile = profile;
  this.logger = logger;
};

BenchWarmer.evalString = function(string, emberPath, logger, profile) {
  var benchWarmer = new BenchWarmer(emberPath, logger, profile);

  var bench = function(name, fn) {
    ember_assert("Please pass in a name and function", arguments.length === 2);
    benchWarmer.bench(name, fn);
  };

  var before = function(fn) {
    benchWarmer.before(fn);
  };

  var after = function(fn) {
    benchWarmer.after(fn);
  };

  eval(string);

  return benchWarmer;
};

BenchWarmer.prototype = {
  log: function(string) {
    this.logger(string);
  },

  before: function(fn) {
    this.setup = fn;
  },

  after: function(fn) {
    this.teardown = fn;
  },

  bench: function(name, fn) {
    var self = this;
    this.name = name;
    this.fn = fn;

    this.benchmark = new Benchmark(name, fn, {
      async: true,

      setup: this.setup,
      teardown: this.teardown,

      onCycle: function(event, bench) {
        self.log("<code>" + name + "</code> x" + event.target.stats.sample.length + " Hz: " + Math.floor(event.target.hz));
      },

      onComplete: function() {
        var moe = Math.round(this.stats.moe / this.stats.mean * 10000) / 100;
        var sampleMoe = (moe / 100) * this.hz;
        self.log("<code>" + name + "</code> x" + this.stats.sample.length + " Hz: " + Math.floor(this.hz) + " &plusmn;" + moe + "% (" + sampleMoe + ")");

        if (self.next) { self.next.run(); }
      }
    });

    return this;
  },

  run: function() {
    if (this.profile) {
      console.profile(this.emberPath + ": " + this.name);
      for (var i=0; i<1000; i++) {
        this.fn();
      }
      console.profileEnd(this.emberPath + ": " + this.name);
      if (this.next) { this.next.run(); }
    } else {
      this.benchmark.run();
    }
  }
};

