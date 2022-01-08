export let assign = Object.assign;

export function fillNulls<T>(count: number): T[] {
  let arr = new Array(count);

  for (let i = 0; i < count; i++) {
    arr[i] = null;
  }

  return arr;
}

export function values<T>(obj: { [s: string]: T }): T[] {
  const vals = [];
  for (const key in obj) {
    vals.push(obj[key]);
  }
  return vals;
}
