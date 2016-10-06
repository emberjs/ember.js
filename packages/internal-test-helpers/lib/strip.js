export default function strip([...strings], ...values) {
  let str = strings.map((string, index) => {
    let interpolated = values[index];
    return string + (interpolated !== undefined ? interpolated : '');
  }).join('');
  return str.split('\n').map(s => s.trim()).join('');
}
