function escapeString(str) {
  str = str.replace(/\\/g, "\\\\");
  str = str.replace(/"/g, '\\"');
  str = str.replace(/\n/g, "\\n");
  return str;
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
  let str = "";
  while (times--) {
    str += chars;
  }
  return str;
}
