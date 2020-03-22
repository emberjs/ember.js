export function verifyRegistration(assert, owner, fullName) {
  assert.ok(owner.resolveRegistration(fullName), `has registration: ${fullName}`);
}

export function verifyInjection(assert, owner, fullName, property, injectionName) {
  let registry = owner.__registry__;
  let injections;

  if (fullName.indexOf(':') === -1) {
    injections = registry.getTypeInjections(fullName);
  } else {
    injections = registry.getInjections(registry.normalize(fullName));
  }

  let normalizedName = registry.normalize(injectionName);
  let hasInjection = false;
  let injection;

  for (let i = 0, l = injections.length; i < l; i++) {
    injection = injections[i];
    if (injection.property === property && injection.specifier === normalizedName) {
      hasInjection = true;
      break;
    }
  }

  assert.ok(hasInjection, `has injection: ${fullName}.${property} = ${injectionName}`);
}
