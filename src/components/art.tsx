// Hand-drawn sticker illustrations for Rotyi. All original artwork as inline
// SVG: no image requests, crisp at any size, recolourable.

type P = { className?: string; title?: string };

const O = "#3e1012"; // outline
const SW = 5;

function Svg({ className, title, viewBox, children }: P & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** The Rotyi kettle (bogrács), the brand mascot. */
export function KettleMascot({ className, title, steam = true }: P & { steam?: boolean }) {
  return (
    <Svg viewBox="0 0 240 240" className={className} title={title}>
      {steam && (
        <g stroke={O} strokeWidth={SW} className="[&>path]:origin-bottom">
          <path d="M92 58c-10-12 10-20 0-34" />
          <path d="M120 52c-10-14 12-22 0-38" />
          <path d="M148 58c-10-12 10-20 0-34" />
        </g>
      )}
      {/* handle */}
      <path d="M44 104C44 52 196 52 196 104" stroke={O} strokeWidth={SW + 1} />
      {/* rim */}
      <ellipse cx="120" cy="104" rx="88" ry="20" fill="#f7c548" stroke={O} strokeWidth={SW} />
      <ellipse cx="120" cy="104" rx="70" ry="11" fill="#d6331a" stroke={O} strokeWidth={4} />
      <circle cx="98" cy="102" r="5" fill="#f6e6d0" />
      <circle cx="140" cy="106" r="4" fill="#f6e6d0" />
      {/* body */}
      <path
        d="M32 106c0 70 40 104 88 104s88-34 88-104c-16 14-50 20-88 20s-72-6-88-20z"
        fill="#2b2522"
        stroke={O}
        strokeWidth={SW}
      />
      <path d="M58 140c6 26 22 44 44 52" stroke="#5b504a" strokeWidth={6} />
      {/* face */}
      <ellipse cx="94" cy="150" rx="15" ry="18" fill="#fff" stroke={O} strokeWidth={4} />
      <ellipse cx="146" cy="150" rx="15" ry="18" fill="#fff" stroke={O} strokeWidth={4} />
      <circle cx="98" cy="154" r="7" fill={O} />
      <circle cx="142" cy="154" r="7" fill={O} />
      <circle cx="100" cy="151" r="2.5" fill="#fff" />
      <circle cx="144" cy="151" r="2.5" fill="#fff" />
      <path d="M104 180c10 10 22 10 32 0" stroke="#f6e6d0" strokeWidth={5} />
      <circle cx="74" cy="176" r="8" fill="#d6331a" opacity=".7" />
      <circle cx="166" cy="176" r="8" fill="#d6331a" opacity=".7" />
      {/* legs */}
      <path d="M70 202l-8 26M170 202l8 26M120 210v24" stroke={O} strokeWidth={SW} />
    </Svg>
  );
}

/** Cartoon glove, used either side of the hero dish. */
export function Glove({ className, flip }: P & { flip?: boolean }) {
  return (
    <Svg viewBox="0 0 160 170" className={className}>
      <g transform={flip ? "translate(160 0) scale(-1 1)" : undefined}>
        <path
          d="M30 150c-12-30-18-62-6-80 8-12 22-10 26 4l6 22 2-62c0-14 20-16 22 0l4 52 6-60c2-14 22-14 22 2l-2 62 12-48c4-12 22-8 20 6l-10 66c-4 30-20 48-46 54-24 6-46-2-56-18z"
          fill="#fff"
          stroke="#c62d17"
          strokeWidth={6}
        />
        <path d="M66 120c8 6 22 6 32 0" stroke="#c62d17" strokeWidth={5} />
        <path d="M24 148c10 16 40 24 66 18" stroke="#c62d17" strokeWidth={10} />
      </g>
    </Svg>
  );
}

export function Paprika({ className, face }: P & { face?: boolean }) {
  return (
    <Svg viewBox="0 0 140 180" className={className}>
      <path d="M70 34c-4-14 4-26 18-28" stroke="#2f6b2c" strokeWidth={8} />
      <path d="M44 42c10-12 42-12 52 0 14 16 26 30 22 70-4 44-28 62-48 62s-44-18-48-62c-4-40 8-54 22-70z" fill="#d6331a" stroke={O} strokeWidth={SW} />
      <path d="M48 44c8-8 36-8 44 0" fill="#2f6b2c" stroke={O} strokeWidth={4} />
      <path d="M46 72c-6 20-6 44 4 64" stroke="#ff8a6b" strokeWidth={7} opacity=".8" />
      {face && (
        <g>
          <circle cx="58" cy="96" r="7" fill={O} />
          <circle cx="86" cy="96" r="7" fill={O} />
          <circle cx="60" cy="93" r="2.4" fill="#fff" />
          <circle cx="88" cy="93" r="2.4" fill="#fff" />
          <path d="M60 118c8 8 18 8 26 0" stroke={O} strokeWidth={5} />
        </g>
      )}
    </Svg>
  );
}

export function Onion({ className }: P) {
  return (
    <Svg viewBox="0 0 140 150" className={className}>
      <path d="M70 18c2 10-2 16 0 20" stroke="#2f6b2c" strokeWidth={6} />
      <path d="M70 36c30 14 56 36 56 66 0 26-26 42-56 42s-56-16-56-42c0-30 26-52 56-66z" fill="#e9c38f" stroke={O} strokeWidth={SW} />
      <path d="M70 40c-22 18-30 44-24 100M70 40c22 18 30 44 24 100M70 40v102" stroke={O} strokeWidth={3} opacity=".5" />
      <path d="M58 136l-6 10M70 140v10M82 136l6 10" stroke={O} strokeWidth={4} />
    </Svg>
  );
}

export function Garlic({ className }: P) {
  return (
    <Svg viewBox="0 0 140 150" className={className}>
      <path d="M70 12c-4 12 2 20 0 30" stroke={O} strokeWidth={5} />
      <path d="M70 40c30 10 56 34 52 64-4 26-26 38-52 38s-48-12-52-38c-4-30 22-54 52-64z" fill="#fbf3e7" stroke={O} strokeWidth={SW} />
      <path d="M70 44c-14 20-18 50-10 96M70 44c14 20 18 50 10 96M44 60c-12 22-14 50-2 76M96 60c12 22 14 50 2 76" stroke={O} strokeWidth={3} opacity=".55" />
    </Svg>
  );
}

export function BayLeaf({ className }: P) {
  return (
    <Svg viewBox="0 0 160 90" className={className}>
      <path d="M8 46C40 6 112 2 152 44 112 86 40 84 8 46z" fill="#5d9a46" stroke={O} strokeWidth={SW} />
      <path d="M8 46h140M46 46l22-18M80 46l22-18M46 46l22 18M80 46l22 18" stroke={O} strokeWidth={3} />
    </Svg>
  );
}

export function SourCream({ className }: P) {
  return (
    <Svg viewBox="0 0 160 130" className={className}>
      <path d="M20 108c-12-20 6-40 24-40-6-24 18-44 40-34 10-22 44-18 46 8 22 0 34 24 20 44 6 14-4 26-16 26H34c-8 0-12-2-14-4z" fill="#fff" stroke={O} strokeWidth={SW} />
      <path d="M60 64c10-6 22-4 30 4" stroke="#e4d6c3" strokeWidth={6} />
    </Svg>
  );
}

export function Tomato({ className }: P) {
  return (
    <Svg viewBox="0 0 150 140" className={className}>
      <circle cx="75" cy="76" r="56" fill="#e84a2a" stroke={O} strokeWidth={SW} />
      <path d="M75 24l-10 14-18-6 8 16-16 8 22 2 6 14 8-14 22 2-16-10 10-16-18 6z" fill="#2f6b2c" stroke={O} strokeWidth={4} />
      <path d="M38 70c2-14 10-24 22-28" stroke="#ffb199" strokeWidth={7} />
    </Svg>
  );
}

export function Nokedli({ className }: P) {
  return (
    <Svg viewBox="0 0 160 110" className={className}>
      {[
        [40, 50, -14],
        [84, 40, 10],
        [118, 64, -4],
        [64, 76, 6],
      ].map(([x, y, r], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) rotate(${r})`}
          d="M-26 0c4-14 22-18 34-12s20 6 20 14-12 14-28 12-30-4-26-14z"
          fill="#f7d98a"
          stroke={O}
          strokeWidth={4}
        />
      ))}
    </Svg>
  );
}

/** Lángos character, a playful second sticker. */
export function LangosBuddy({ className }: P) {
  return (
    <Svg viewBox="0 0 200 180" className={className}>
      <path d="M22 96c-8-40 30-74 78-74s88 28 80 70c-6 36-40 64-82 64S28 132 22 96z" fill="#f2b65a" stroke="#c62d17" strokeWidth={6} />
      <path d="M44 92c-2-26 26-46 56-46s58 18 56 44c-2 24-26 40-56 40s-54-14-56-38z" fill="#fff" stroke="#c62d17" strokeWidth={4} />
      <path d="M60 70l14 10M88 62l6 16M118 66l-4 16M138 80l-12 8M70 108l10-8M120 108l-6-10" stroke="#f7c548" strokeWidth={8} />
      <circle cx="78" cy="94" r="7" fill="#3e1012" />
      <circle cx="122" cy="94" r="7" fill="#3e1012" />
      <path d="M90 112c6 6 14 6 20 0" stroke="#3e1012" strokeWidth={5} />
      <path d="M30 120l-16 14M170 120l16 14M70 156l-6 20M130 156l6 20" stroke="#c62d17" strokeWidth={6} />
    </Svg>
  );
}

export function Scooter({ className }: P) {
  return (
    <Svg viewBox="0 0 220 160" className={className}>
      <rect x="20" y="40" width="70" height="56" rx="10" fill="#d6331a" stroke={O} strokeWidth={SW} />
      <path d="M36 60h38M36 74h26" stroke="#fff" strokeWidth={6} />
      <path d="M90 108h70l20-50h18" stroke={O} strokeWidth={SW + 1} />
      <path d="M60 108c0-12 10-20 30-20h40c14 0 24 8 26 20z" fill="#f7c548" stroke={O} strokeWidth={SW} />
      <circle cx="58" cy="120" r="20" fill="#fff" stroke={O} strokeWidth={SW} />
      <circle cx="176" cy="120" r="20" fill="#fff" stroke={O} strokeWidth={SW} />
      <circle cx="58" cy="120" r="6" fill={O} />
      <circle cx="176" cy="120" r="6" fill={O} />
      <path d="M198 58l12-6" stroke={O} strokeWidth={SW} />
      <path d="M6 70h8M2 88h12M8 52h6" stroke="#c62d17" strokeWidth={5} />
    </Svg>
  );
}

export function Star({ className }: P) {
  return (
    <Svg viewBox="0 0 100 100" className={className}>
      <path d="M50 6l12 28 30 4-22 20 6 30-26-14-26 14 6-30L8 38l30-4z" fill="#f7c548" stroke={O} strokeWidth={4} />
    </Svg>
  );
}

/** Rotating circular badge text, e.g. "IGAZI PAPRIKA • IGAZI PAPRIKA •". */
export function RoundBadge({ text, className }: { text: string; className?: string }) {
  const id = `badge-${text.replace(/\W/g, "")}`;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <path id={id} d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
      </defs>
      <circle cx="60" cy="60" r="58" fill="#f7c548" stroke="#3e1012" strokeWidth="3" />
      <g className="spin-slow" style={{ transformOrigin: "60px 60px" }}>
        <text fontFamily="var(--font-sticker)" fontSize="13" letterSpacing="2" fill="#3e1012">
          <textPath href={`#${id}`}>{`${text} • ${text} • `}</textPath>
        </text>
      </g>
      <g transform="translate(36 30) scale(.34)">
        <Paprika />
      </g>
    </svg>
  );
}

export function Logo({ className }: P) {
  return (
    <span className={`font-[family-name:var(--font-sticker)] tracking-tight leading-none ${className ?? ""}`}>
      ROTYI
    </span>
  );
}
