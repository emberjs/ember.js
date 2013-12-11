/* jshint esnext: true */
/* globals $ */

function createFrame(name, libPath) {
  var iframe = $('<iframe>', {
        id: name,
        style: 'border: 0; display: none'
      }).appendTo('body')[0],
      write  = function(content) { iframe.contentDocument.write(content); };

  iframe.name = name;
  write('<title>' + name + '</title>');
  write('<script src="lib/dependencies/jquery.js"></script>');
  write('<script src="lib/dependencies/hbs.js"></script>');
  write('<script src="implementations/' + libPath + '"></script>');
  write('<script src="node_modules/lodash/lodash.js"></script>');
  write('<script src="node_modules/benchmark/benchmark.js"></script>');
  write('<script src="vendor/loader.js"></script>');
  write('<script src="tmp/public/bundle.amd.js"></script>');
  write('<script>define("benchmark",[],function(){return Benchmark;});</script>');
  write('<script>require("benchmark-runner").run();</script>');
  write('<body></body>');

  return iframe;
}

export function wrapper(name, libPath) {
  createFrame(name, libPath);
}
