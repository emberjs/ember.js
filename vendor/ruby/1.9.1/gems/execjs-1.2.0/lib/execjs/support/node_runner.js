(function(program, execJS, module, exports, require) { execJS(program) })(function() { #{source}
}, function(program) {
  var output, print = function(string) {
    process.stdout.write('' + string);
  };
  try {
    result = program();
    if (typeof result == 'undefined' && result !== null) {
      print('["ok"]');
    } else {
      try {
        print(JSON.stringify(['ok', result]));
      } catch (err) {
        print('["err"]');
      }
    }
  } catch (err) {
    print(JSON.stringify(['err', '' + err]));
  }
});
