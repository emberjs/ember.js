function escapeString(str) {
  return str.replace(/'/g, "\\'");
}

export { escapeString };

function string(str) {
  return "'" + escapeString(str) + "'";
}

export { string };

function array(array) {
  return "[" + array + "]";
}

export { array };

export function quotedArray(list) {
  return array(list.map(string).join(", "));
}

export function hash(pairs) {
  return "{" + pairs.join(",") + "}";
}