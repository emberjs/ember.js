function escapeString(str) {
  return str.replace(/'/g, "\\'");
}

export { escapeString };

function string(str) {
  return "'" + escapeString(str) + "'";
}

export { string };

function quotedArray(list) {
  return array(list.map(string).join(", "));
}

export { quotedArray };

function array(array) {
  return "[" + array + "]";
}

export { array };

function hash(pairs) {
  return "{" + pairs.join(",") + "}";
}

export { hash };
