export function cn(...classes) {
  return classes.flatMap((item) => Array.isArray(item) ? item : [item]).filter(Boolean).join(' ')
}
