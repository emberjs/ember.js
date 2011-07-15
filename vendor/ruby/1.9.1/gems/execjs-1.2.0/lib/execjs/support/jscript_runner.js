(function(program, execJS) { execJS(program) })(function() { #{source}
}, function(program) {
  #{json2_source}
  var output, print = function(string) {
    WScript.Echo(string);
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
    print(JSON.stringify(['err', err.name + ': ' + err.message]));
  }
});
