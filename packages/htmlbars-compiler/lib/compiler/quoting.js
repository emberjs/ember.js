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

export function quotedArray(list) {
  return array(list.map(string).join(", "));
}

export function hash(pairs) {
  return "{" + pairs.join(",") + "}";
}
