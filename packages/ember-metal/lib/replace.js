let { splice } = Array.prototype;

export default function replace(array, idx, amt, objects) {
  let args = [].concat(objects);
  let ret = [];
  // https://code.google.com/p/chromium/issues/detail?id=56588
  let size = 60000;
  let start = idx;
  let ends = amt;
  let count, chunk;

  while (args.length) {
    count = ends > size ? size : ends;
    if (count <= 0) { count = 0; }

    chunk = args.splice(0, size);
    chunk = [start, count].concat(chunk);

    start += size;
    ends -= count;

    ret = ret.concat(splice.apply(array, chunk));
  }
  return ret;
}
