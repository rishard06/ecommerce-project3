import Image from "next/image";
import { auth } from "../lib/auth"; // path to your Better Auth server instance
import { headers } from "next/headers";
import Header from "../component/Header";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  return (
    <>
      <Header session={session} />
    </>
  );
}
