import { KettleMascot, Paprika } from "./art";

/** Shared top block for inner pages: sticker, stacked display title, lead. */
export function PageHero({ sticker, title, lead }: { sticker: string; title: string[]; lead?: string }) {
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-32 sm:px-6 sm:pt-40">
      <KettleMascot className="floaty absolute right-[4%] top-28 hidden w-28 [--r:10deg] md:block" />
      <Paprika face className="floaty absolute left-[3%] top-48 hidden w-16 [--float-speed:4s] [--r:-14deg] lg:block" />
      <div className="mx-auto max-w-[1300px]">
        <span className="sticker hero-pop">{sticker}</span>
        <h1 className="display mt-4 text-[clamp(4rem,14vw,11rem)] text-paprika-ink">
          {title.map((line, i) => (
            <span
              key={line}
              className={`hero-word block ${i % 2 ? "text-ink" : ""}`}
              style={{ animationDelay: `calc(var(--hero-base) + ${i * 0.1}s)` }}
            >
              {line}
            </span>
          ))}
        </h1>
        {lead && <p className="mt-5 max-w-2xl text-xl text-ink/85 sm:text-2xl">{lead}</p>}
      </div>
    </section>
  );
}
