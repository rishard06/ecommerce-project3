import Link from "next/link";

export default function Logo() {
  return (
    <Link
      href="/"
      aria-label="venn. home"
      className="shrink-0 rounded-full px-1 text-2xl font-semibold tracking-tight text-gray-primary transition-opacity hover:opacity-80 md:text-[1.7rem]"
    >
      <span className="text-accent-600">v</span>enn.
    </Link>
  );
}
