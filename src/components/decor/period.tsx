/**
 * A heading's closing period, the poster's pink dot. On the canvas it is type
 * in the accent color, so it stays in the Calm look. On a color band it is a
 * paint dot (accent text isn't readable on every band), so it is decor and
 * goes with the rest in Calm. Screen readers skip it either way: the heading
 * reads the same without it.
 */
export function Period({ onBand = false }: { onBand?: boolean }) {
  if (onBand) {
    return (
      <span
        aria-hidden
        data-decor=""
        className="ml-[0.06em] inline-block size-[0.16em] rounded-full bg-pop-pink align-baseline"
      />
    );
  }
  return (
    <span aria-hidden className="text-primary">
      .
    </span>
  );
}
