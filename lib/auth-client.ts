import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    /** Same-domain default — avoids hardcoded localhost port mismatches */
})

export const { signIn, signUp, signOut, useSession } = authClient
