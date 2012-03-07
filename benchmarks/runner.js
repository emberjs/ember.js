/*global jQuery Benchmark BenchWarmer:true*/

BenchWarmer = function(contentWindow, emberPath) {
  this.contentWindow = contentWindow;
  this.emberPath = emberPath;
};

BenchWarmer.bench = function(name, fn) {
  new BenchWarmer(this).bench(name, fn);
};

BenchWarmer.prototype = {
  log: function(string) {
    jQuery("[data-ember-path='" + this.emberPath + "']").html("<p>" + string + "</p>");
  },

  bench: function(name, fn) {
    var self = this;

    this.benchmark = new Benchmark(name, fn, {
      async: true,

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
    this.benchmark.run();
  }
};

BenchWarmer.embers = {
  before: "ember.js",
  after: "../dist/ember.min.js"
};

function makeiframe(emberPath, suitePath, callback) {
  var iframe = jQuery("<iframe>").appendTo("body")[0];
  var write = function(str) { iframe.contentDocument.write(str); };

  write("<script src='../tests/jquery-1.7.1.js'></script>");
  write("<script src='" + emberPath + "'></script>");
  write("<script src='benchmark.js'></script>");
  write("<applet code='nano' archive='nano.jar'></applet>");

  var bench;

  setTimeout(function() {
    jQuery.ajax({
      url: suitePath,
      async: false,
      complete: function(xhr) {
        console.log(xhr);
        iframe.contentWindow.bench = function(name, fn) {
          bench = new BenchWarmer(this, emberPath).bench(name, fn);
        };

        iframe.contentWindow.jQuery.globalEval(xhr.responseText);
        callback(bench);
      }
    });
  }, 1000);
}

jQuery(function() {

  var query = window.location.search;
  var decoded = decodeURIComponent(query).slice(1).split(/[&=]/);

  var options = {};

  // Parse query string for options
  for (var i=0, l=decoded.length; i<l; i+=2) {
    options[decoded[i]] = decoded[i + 1];
  }

  var beforeBench, afterBench;

  makeiframe(BenchWarmer.embers.before, "suites/" + options.suitePath, function(bench) {
    beforeBench = bench;

    makeiframe(BenchWarmer.embers.after, "suites/" + options.suitePath, function(bench) {
      afterBench = bench;
      beforeBench.next = afterBench;
      beforeBench.run();
    });
  });
});
