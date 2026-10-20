// Plain-function helper (default helper manager).
export default function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}
