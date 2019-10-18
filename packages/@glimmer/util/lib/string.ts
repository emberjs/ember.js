export function strip(strings: TemplateStringsArray, ...args: unknown[]) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    let string = strings[i];
    let dynamic = args[i] !== undefined ? String(args[i]) : '';

    out += `${string}${dynamic}`;
  }

  let lines = out.split('\n');

  while (lines.length && lines[0].match(/^\s*$/)) {
    lines.shift();
  }

  while (lines.length && lines[lines.length - 1].match(/^\s*$/)) {
    lines.pop();
  }

  let min = Infinity;

  for (let line of lines) {
    let leading = line.match(/^\s*/)![0].length;

    min = Math.min(min, leading);
  }

  let stripped = [];

  for (let line of lines) {
    stripped.push(line.slice(min));
  }

  return stripped.join('\n');
}
