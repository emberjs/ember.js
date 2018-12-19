let testing = false;

export function isTesting(): boolean {
  return testing;
}

export function setTesting(value: boolean) {
  testing = Boolean(value);
}
