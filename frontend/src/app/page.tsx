export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

  return (
    <main className="flex flex-1 items-center justify-center bg-stone-100 px-6 py-16 font-sans text-stone-950">
      <section className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700 uppercase">
          cjcrsg-flow
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">
          Build content in Canva. Publish with confidence.
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">
          Connect Canva to retrieve your brand templates, inspect their Autofill
          fields, and generate export-ready designs.
        </p>
        <a
          className="mt-8 inline-flex rounded-full bg-emerald-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-800"
          href={`${apiUrl}/oauth/authorize`}
        >
          Connect to Canva
        </a>
      </section>
    </main>
  );
}
