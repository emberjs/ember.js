export function objectAt(content, idx) {
  if (typeof content.objectAt === 'function') {
    return content.objectAt(idx);
  } else {
    return content[idx];
  }
}
