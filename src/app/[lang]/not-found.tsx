import Link from "next/link";
import { KettleMascot } from "@/components/art";

export default function NotFound() {
  return (
    <section className="grid min-h-[80vh] place-items-center px-4 pt-28 text-center">
      <div>
        <KettleMascot className="wobble mx-auto w-40" steam={false} />
        <h1 className="display mt-6 text-7xl text-paprika-ink">404</h1>
        <p className="mt-3 text-xl">Ez a fazék üres. · This pot is empty.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/hu" className="pill pill-red">Kezdőlap</Link>
          <Link href="/en" className="pill pill-ink">Home</Link>
        </div>
      </div>
    </section>
  );
}
