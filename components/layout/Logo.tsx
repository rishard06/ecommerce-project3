import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/">
      <div className="text-3xl md:text-4xl font-bold flex items-center">
        <h1 className="text-accent-500">v</h1>enn.
      </div>
    </Link>
  );
}
