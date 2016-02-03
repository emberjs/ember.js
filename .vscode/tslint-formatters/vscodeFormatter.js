'use strict';

function Formatter() {}

Formatter.prototype.format = function(failures) {
  var outputLines = failures.map(function (failure) {
    var fileName = failure.getFileName();
    var failureString = failure.getFailure();
    var lineAndCharacter = failure.getStartPosition().getLineAndCharacter();
    var line = lineAndCharacter.line + 1;
    var character = lineAndCharacter.character + 1;
    return fileName + "(" + line + "," + character + "): warning TS1337: " + failureString;
  });

  return outputLines.join("\n") + "\n";
}

exports.Formatter = Formatter;
