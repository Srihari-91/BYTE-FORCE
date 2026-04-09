/**
 * Class name utility - merge class names
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
