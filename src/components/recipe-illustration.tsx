import { CANVAS, groundTurn, type Illustration } from "@/lib/illustration";

/** The pale paper behind every drawing. Ours, not the model's. */
const GROUND_PATH =
  "M44 64 C92 18 226 8 278 56 C322 100 306 246 254 284 C194 322 74 304 36 244 C8 196 12 102 44 64 Z";

const centre = CANVAS / 2;

/**
 * A cut-paper drawing. Pieces are faded as one group, so overlaps do not show
 * through each other. Decorative, so hidden from assistive technology.
 *
 * @param seed turns the pale paper, so two drawings on the same ground differ
 */
export function RecipeIllustration({
  illustration,
  seed,
  className,
}: {
  illustration: Illustration | null;
  seed: string;
  className?: string;
}) {
  const ground = illustration?.ground ?? "green";
  const cut = `var(--color-art-ground-${ground})`;

  return (
    <svg
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      className={className}
      aria-hidden="true"
      focusable="false"
      // Pieces may run past the canvas, and the window edge is what trims them.
      overflow="visible"
    >
      <path d={GROUND_PATH} fill={cut} transform={`rotate(${groundTurn(seed)} ${centre} ${centre})`} />
      {illustration && (
        <g style={{ opacity: "var(--art-opacity)" }}>
          {illustration.pieces.map((piece, index) => {
            const colour = piece.colour === "cut" ? cut : `var(--color-art-${piece.colour})`;

            return piece.kind === "stroke" ? (
              <path
                key={index}
                d={piece.d}
                fill="none"
                stroke={colour}
                strokeWidth={piece.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path key={index} d={piece.d} fill={colour} />
            );
          })}
        </g>
      )}
    </svg>
  );
}
