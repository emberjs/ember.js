function includes(message, search) {
  return message.includes ? message.includes(search) : message.indexOf(search) !== -1;
}

function checkMatcher(message, matcher) {
  if (typeof matcher === 'string') {
    return includes(message, matcher);
  } else if (matcher instanceof RegExp) {
    return !!message.match(matcher);
  } else if (matcher) {
    throw new Error(`ember-qunit-assert-helpers can only match Strings and RegExps. "${typeof matcher}" was provided.`);
  }

  // No matcher always returns true. Makes the code easier elsewhere.
  return true;
}

export function assertDeprecations(qunitAssert, matcher, deprecations) {
  let matchedDeprecations = deprecations.filter(deprecation => {
    return checkMatcher(deprecation.message, matcher);
  });

  qunitAssert.pushResult({
    result: matchedDeprecations.length !== 0,
    actual: matchedDeprecations,
    expected: null,
    message: 'Expected deprecations during test, but no deprecations were found.'
  });
}

export function assertNoDeprecations(qunitAssert, deprecations) {
  let deprecationStr = deprecations.reduce((a, b) => {
    return `${b}${a.message}\n`;
  }, '');

  qunitAssert.pushResult({
    result: deprecations.length === 0,
    actual: deprecations,
    expected: [],
    message: `Expected no deprecations during test, but deprecations were found.\n${deprecationStr}`
  });
}

export function assertDeferredChecks(qunitAssert, deferredChecks, deprecations) {
  deferredChecks.forEach(check => {
    assertDeprecations(qunitAssert, check, deprecations);
  });
}
