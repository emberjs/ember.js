export function verifyRegistration(assert, owner, fullName) {
  assert.ok(owner.resolveRegistration(fullName), `has registration: ${fullName}`);
}
