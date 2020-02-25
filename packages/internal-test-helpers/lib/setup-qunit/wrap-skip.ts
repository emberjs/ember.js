export function wrapSkip(skip: QUnit['skip'], forceskip?: boolean): QUnit['skip'] {
  if (forceskip) {
    return function(string: string, callback: (assert: Assert) => void) {
      string = 'SKIPPED: ' + string;
      return QUnit.test(string, callback);
    };
  }
  return function(string, callback) {
    string = 'SKIPPED: ' + string;
    return skip(string, callback);
  };
}
