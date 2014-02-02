// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals CoreTest */

/**
  Tests for equality any JavaScript type and structure without unexpected 
  results.

  Discussions and reference: http://philrathe.com/articles/equiv
  Test suites: http://philrathe.com/tests/equiv
  Author: Philippe Rathé <prathe@gmail.com>
*/
CoreTest.equiv = function () {

    var innerEquiv; // the real equiv function
    var callers = []; // stack to decide between skip/abort functions

    // Determine what is o.
    function hoozit(o) {
        if (typeof o === "string") {
            return "string";

        } else if (typeof o === "boolean") {
            return "boolean";

        } else if (typeof o === "number") {

            if (isNaN(o)) {
                return "nan";
            } else {
                return "number";
            }

        } else if (typeof o === "undefined") {
            return "undefined";

        // consider: typeof null === object
        } else if (o === null) {
            return "null";

        // consider: typeof [] === object
        } else if (o instanceof Array) {
            return "array";
        
        // consider: typeof new Date() === object
        } else if (o instanceof Date) {
            return "date";

        // consider: /./ instanceof Object;
        //           /./ instanceof RegExp;
        //          typeof /./ === "function"; // => false in IE and Opera,
        //                                          true in FF and Safari
        } else if (o instanceof RegExp) {
            return "regexp";

        } else if (typeof o === "object") {
            return "object";

        } else if (o instanceof Function) {
            return "function";
        }
    }

    // Call the o related callback with the given arguments.
    function bindCallbacks(o, callbacks, args) {
        var prop = hoozit(o);
        if (prop) {
            if (hoozit(callbacks[prop]) === "function") {
                return callbacks[prop].apply(callbacks, args);
            } else {
                return callbacks[prop]; // or undefined
            }
        }
    }

    var callbacks = function () {

        // for string, boolean, number and null
        function useStrictEquality(b, a) {
            return a === b;
        }

        return {
            "string": useStrictEquality,
            "boolean": useStrictEquality,
            "number": useStrictEquality,
            "null": useStrictEquality,
            "undefined": useStrictEquality,

            "nan": function (b) {
                return isNaN(b);
            },

            "date": function (b, a) {
                return hoozit(b) === "date" && a.valueOf() === b.valueOf();
            },

            "regexp": function (b, a) {
                return hoozit(b) === "regexp" &&
                    a.source === b.source && // the regex itself
                    a.global === b.global && // and its modifiers (gmi) ...
                    a.ignoreCase === b.ignoreCase &&
                    a.multiline === b.multiline;
            },

            // - skip when the property is a method of an instance (OOP)
            // - abort otherwise,
            //   initial === would have catch identical references anyway
            "function": function () {
                var caller = callers[callers.length - 1];
                return caller !== Object &&
                        typeof caller !== "undefined";
            },

            "array": function (b, a) {
                var i;
                var len;

                // b could be an object literal here
                if ( ! (hoozit(b) === "array")) {
                    return false;
                }

                len = a.length;
                if (len !== b.length) { // safe and faster
                    return false;
                }
                for (i = 0; i < len; i++) {
                    if( ! innerEquiv(a[i], b[i])) {
                        return false;
                    }
                }
                return true;
            },

            "object": function (b, a) {
                var i;
                var eq = true; // unless we can proove it
                var aProperties = [], bProperties = []; // collection of strings
                if (b===a) return true;
                
                // comparing constructors is more strict than using instanceof
                if ( a.constructor !== b.constructor) {
                    return false;
                }

                // stack constructor before traversing properties
                callers.push(a.constructor);

                for (i in a) { // be strict: don't ensures hasOwnProperty and go deep

                    aProperties.push(i); // collect a's properties

                    if ( ! innerEquiv(a[i], b[i])) {
                        eq = false;
                    }
                }

                callers.pop(); // unstack, we are done

                for (i in b) {
                    bProperties.push(i); // collect b's properties
                }

                // Ensures identical properties name
                return eq && innerEquiv(aProperties.sort(), bProperties.sort());
            }
        };
    }();

    innerEquiv = function () { // can take multiple arguments
        var args = Array.prototype.slice.apply(arguments);
        if (args.length < 2) {
            return true; // end transition
        }

        return (function (a, b) {
            if (a === b) {
                return true; // catch the most you can

            } else if (typeof a !== typeof b || a === null || b === null || typeof a === "undefined" || typeof b === "undefined") {
                return false; // don't lose time with error prone cases

            } else if (b && b.isEqual && b.isEqual instanceof Function) {
              return b.isEqual(a);
              
            } else {
                return bindCallbacks(a, callbacks, [b, a]);
            }

        // apply transition with (1..n) arguments
        })(args[0], args[1]) && arguments.callee.apply(this, args.splice(1, args.length -1));
    };

    return innerEquiv;
}(); // equiv
