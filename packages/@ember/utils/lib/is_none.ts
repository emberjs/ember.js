export default function isNone(obj: any): obj is null | undefined {
  return obj === null || obj === undefined;
}
