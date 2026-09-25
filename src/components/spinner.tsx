/** A button's busy sign. Hidden from screen readers, which hear the label change. */
export function Spinner() {
  return (
    <span
      aria-hidden
      className="border-current/40 size-4 animate-spin rounded-full border-2 border-t-current motion-reduce:animate-none"
    />
  );
}
