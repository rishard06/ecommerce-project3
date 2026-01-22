import { authClient } from "@/lib/auth-client" // import the auth client

export function User(){
  const { 
      data: session, 
      isPending, //loading state
      error, //error object
      refetch //refetch the session
  } = authClient.useSession() 

  // This function is a custom hook that wraps the `authClient.useSession()` hook from the `better-auth` library.
  // It will return the session information, loading and error states, and a refetch function.
  // As long as the `better-auth` library is configured correctly, this function should work as expected.
    return ({
      session,
      isPending,
      error,
      refetch
    })
}
