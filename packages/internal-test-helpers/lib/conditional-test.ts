function testIf(condition: boolean) {
  return condition ? '@test' : '@skip';
}

function testUnless(condition: boolean) {
  return testIf(!condition);
}

export { testIf, testUnless };
