/**
  Define an assertion that will throw an exception if the condition is not 
  met.  Ember build tools will remove any calls to ember_assert() when 
  doing a production build.
  
  ## Examples
  
      #js:
      
      // pass a simple Boolean value
      ember_assert('must pass a valid object', !!obj);

      // pass a function.  If the function returns false the assertion fails
      // any other return value (including void) will pass.
      ember_assert('a passed record must have a firstName', function() {
        if (obj instanceof Ember.Record) {
          return !Ember.empty(obj.firstName);
        }
      });
      
  @static
  @function
  @param {String} desc
    A description of the assertion.  This will become the text of the Error
    thrown if the assertion fails.
    
  @param {Boolean} test
    Must return true for the assertion to pass.  If you pass a function it
    will be executed.  If the function returns false an exception will be
    thrown.
*/
window.ember_assert = window.sc_assert = function ember_assert(desc, test) {
  if ('function' === typeof test) test = test()!==false;
  if (!test) throw new Error("assertion failed: "+desc);
};



window.ember_deprecate = function(desc) {
  var error, stackStr = '';

  // When using new Error, we can't do the arguments check for Chrome. Alternatives are welcome
  try { __fail__; } catch (e) { error = e; }

  if (error.stack) {
    var stack;

    if (error['arguments']) {
      // Chrome
      stack = error.stack.replace(/^\s+at\s+/gm, '').
                          replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').
                          replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
      stack.shift();
    } else {
      // Firefox
      stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').
                          replace(/^\(/gm, '{anonymous}(').split('\n');
    }

    stackStr = "\n    " + stack.slice(2).join("\n    ");
  }

  console.warn("DEPRECATION: "+desc+stackStr);
};
