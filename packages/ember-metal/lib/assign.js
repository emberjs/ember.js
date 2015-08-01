export default function assign(original, ...args) {
  for (let i = 0, l = args.length; i < l; i++) {
    let arg = args[i];
    if (!arg) { continue; }

    let updates = Object.keys(arg);

    for (let i = 0, l = updates.length; i < l; i++) {
      let prop = updates[i];
      original[prop] = arg[prop];
    }
  }

  return original;
}
