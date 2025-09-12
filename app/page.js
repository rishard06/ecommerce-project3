import Image from "next/image";
import { auth } from "../lib/auth"; // path to your Better Auth server instance
import { headers } from "next/headers";
import SignIn from "../component/signIn";
import Homee from "../component/pageCopy";
import { MeshGradient } from "@paper-design/shaders-react";
import Header from "../component/Header";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  return (
    <>
      <Header session={session} />
      <MeshGradient
        speed={0.7}
        colors={["#c7dae1", "#61c295ba", "#98cdb1", "#73bfb0e6"]}
        className="absolute inset-0 w-full h-screen mix-blend-normal opacity-60"
        style={{ zIndex: -1 }}
      />

      <MeshGradient
        speed={0.7}
        colors={["#c7dae1", "#61c295ba", "#98cdb1", "#73bfb0e6", "#1f6e53"]}
        distortion={1}
        className="absolute inset-0 w-full h-screen mix-blend-multiply opacity-35"
        style={{ zIndex: -1 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#9ee9dc] via-transparent to-white-200-900/0 z-10"></div>

      <div className="z-20 font-sans font-bold grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <div>
          {session?.user ? (
            <h1 className="text-center">{session?.user?.name}</h1>
          ) : (
            <h1 className="text-center">Hello!!</h1>
          )}
          <SignIn session={session} />
        </div>
      </div>
          <Homee />

      <div className="z-20 font-sans font-bold grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <div>
          {session?.user ? (
            <h1 className="text-center">{session?.user?.name}</h1>
          ) : (
            <h1 className="text-center">Hello!!</h1>
          )}
          <SignIn session={session} />
        </div>
      </div>

      <div className="z-20 font-sans font-bold grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <div>
          {session?.user ? (
            <h1 className="text-center">{session?.user?.name}</h1>
          ) : (
            <h1 className="text-center">Hello!!</h1>
          )}
          <SignIn session={session} />
        </div>
      </div>
    </>
  );
}
