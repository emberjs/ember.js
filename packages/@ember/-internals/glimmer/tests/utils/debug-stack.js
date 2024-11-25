function debugStackMessage(message, renderTree, includeTopLevel) {
  let topLevel = '';

  if (includeTopLevel === 'outlet') {
    topLevel = '{{outlet}} for -top-level\n {4}-top-level\n {6}';
  } else if (includeTopLevel) {
    topLevel = '-top-level\n {4}';
  }

  return `${message}[\\S\\s]*- While rendering:\n {2}${topLevel}${renderTree.join('\\n\\s*')}`;
}

export function debugStackMessageFor(message, { renderTree, includeTopLevel = true }) {
  // Join with a regex that consumes all characters
  return new RegExp(debugStackMessage(message, renderTree, includeTopLevel));
}

export function backtrackingMessageFor(key, obj, { renderTree, includeTopLevel = true } = {}) {
  // Start off with standard backtracking assertion
  let message;

  if (obj) {
    message = `You attempted to update \`${key}\` on \`${obj}\``;
  } else {
    message = `You attempted to update \`${key}\``;
  }

  if (renderTree) {
    message = debugStackMessage(
      `${message}[\\S\\s]*\`${key}\` was first used:`,
      renderTree,
      includeTopLevel
    );
  }

  // Join with a regex that consumes all characters
  return new RegExp(`${message}[\\S\\s]*Stack trace for the update:`);
}
