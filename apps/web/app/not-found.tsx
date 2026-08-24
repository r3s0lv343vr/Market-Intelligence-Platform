import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Company not in this warehouse</h1>
      <p className="text-sm text-mute">Fixture universe is NSM, HBT, and LATT.</p>
      <Link href="/" className="text-sm underline">
        Back to search
      </Link>
    </div>
  );
}
