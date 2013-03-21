define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function escapeString(str) {
      return str.replace(/'/g, "\\'");
    }


    function string(str) {
      return "'" + escapeString(str) + "'";
    }


    function quotedArray(list) {
      return array(list.map(string).join(", "));
    }


    function array(array) {
      return "[" + array + "]";
    }


    function hash(pairs) {
      return "{" + pairs.join(",") + "}";
    }


    __exports__.escapeString = escapeString;
    __exports__.string = string;
    __exports__.quotedArray = quotedArray;
    __exports__.array = array;
    __exports__.hash = hash;
  });
