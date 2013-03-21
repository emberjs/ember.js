function escapeString(string) {
  return string.replace(/'/g, "\\'");
}

export { escapeString };

function quotedString(string) {
  return "'" + escapeString(string) + "'";
}

export { quotedString };

function quotedArray(list) {
  return array(list.map(quotedString).join(", "));
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
