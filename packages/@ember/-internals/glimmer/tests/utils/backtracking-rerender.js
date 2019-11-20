const SUPPORTS_STACK_TRACE = Boolean(new Error().stack);

export function backtrackingMessageFor(key, obj, { renderTree } = {}) {
  // Start off with standard backtracking assertion
  let regex = [`You attempted to update \`${key}\` on \`${obj}\``];

  if (renderTree) {
    // match the renderTree if it was included
    regex.push(`\`${key}\` was first used:`);
    regex.push('- While rendering:');
    regex.push(renderTree.join('\\n\\s*'));
  }

  // Ensure both stack traces are given
  if (SUPPORTS_STACK_TRACE) {
    regex.push(`Stack trace for the first usage:`);
  }
  regex.push(`Stack trace for the update:`);

  // Join with a regex that consumes all characters
  return new RegExp(regex.join('[\\S\\s]*'));
}
