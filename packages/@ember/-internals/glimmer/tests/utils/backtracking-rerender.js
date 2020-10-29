export function backtrackingMessageFor(key, obj, { renderTree } = {}) {
  // Start off with standard backtracking assertion
  let regex;

  if (obj) {
    regex = [`You attempted to update \`${key}\` on \`${obj}\``];
  } else {
    regex = [`You attempted to update \`${key}\``];
  }

  if (renderTree) {
    // match the renderTree if it was included
    regex.push(`\`${key}\` was first used:`);
    regex.push('- While rendering:');
    regex.push(renderTree.join('\\n\\s*'));
  }

  // Ensure stack trace is given
  regex.push(`Stack trace for the update:`);

  // Join with a regex that consumes all characters
  return new RegExp(regex.join('[\\S\\s]*'));
}
