export default function readonly(morph, env, scope, originalParams, hash, template, inverse) {
  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    return originalParams[0];
  }

  return true;
}
