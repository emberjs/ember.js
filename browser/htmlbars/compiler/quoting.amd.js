define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function escapeString(string) {
      return string.replace(/'/g, "\\'");
    }


    function quotedString(string) {
      return "'" + escapeString(string) + "'";
    }


    function quotedArray(list) {
      return array(list.map(quotedString).join(", "));
    }


    function array(array) {
      return "[" + array + "]";
    }


    function hash(pairs) {
      return "{" + pairs.join(",") + "}";
    }


    __exports__.escapeString = escapeString;
    __exports__.quotedString = quotedString;
    __exports__.quotedArray = quotedArray;
    __exports__.array = array;
    __exports__.hash = hash;
  });
