import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          cjcrsg-flow
        </p>
        <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight">
          Build content in Canva. Publish with confidence.
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Connect Canva to retrieve your brand templates, inspect their Autofill fields, and
          generate export-ready designs.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/templates">Browse templates</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
