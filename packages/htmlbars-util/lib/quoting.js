function escapeString(str) {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export { escapeString };

function string(str) {
  return '"' + escapeString(str) + '"';
}

export { string };

function array(a) {
  return "[" + a + "]";
}

export { array };

export function hash(pairs) {
  return "{" + pairs.join(", ") + "}";
}

export function repeat(chars, times) {
  var str = "";
  while (times--) {
    str += chars;
  }
  return str;
}
