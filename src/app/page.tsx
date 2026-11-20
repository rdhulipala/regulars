import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function Home() {
  const providers = await prisma.provider.findMany();
  return (
    <main className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Regulars</h1>
      <p className="text-gray-600">
        Demo providers seeded by <code>npm run db:seed</code>.
      </p>
      <ul className="space-y-3">
        {providers.map((p) => (
          <li key={p.id} className="border rounded-xl p-4 flex justify-between items-center">
            <span className="font-semibold">{p.name}</span>
            <span className="flex gap-3 text-sm">
              <Link className="text-blue-600 underline" href={`/provider/${p.slug}`}>
                Provider dashboard
              </Link>
              <Link className="text-blue-600 underline" href={`/book/${p.slug}`}>
                Client booking page
              </Link>
            </span>
          </li>
        ))}
      </ul>
      {providers.length === 0 && (
        <p className="text-sm text-gray-500">
          No providers yet. Run <code>npm run db:push && npm run db:seed</code> to create a demo
          trainer.
        </p>
      )}
    </main>
  );
}
