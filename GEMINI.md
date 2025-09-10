# Project Overview

This is a Next.js project bootstrapped with `create-next-app`. It appears to be an e-commerce application, given the project name and the presence of a database schema. The project uses Next.js for the frontend and backend, with Prisma as the ORM for interacting with a PostgreSQL database. Authentication is likely handled by the `better-auth` and `@prisma/client` libraries.

## Building and Running

To get the development server running, use the following command:

```bash
npm run dev
```

This will start the development server with Turbopack. You can then access the application at [http://localhost:3000](http://localhost:3000).

Other available scripts are:

*   `npm run build`: To build the application for production.
*   `npm run start`: To start the production server.

## Development Conventions

The project uses `tailwindcss` for styling, as indicated by the `tailwind.config.mjs` and `postcss.config.mjs` files. The database schema is defined in `prisma/schema.prisma`, and the generated Prisma client is located in `app/generated/prisma`.

The application is structured with the main page at `app/page.js` and API routes under `app/api`. A custom header component is located at `component/Header.js`.

Authentication is handled by `better-auth`, with the authentication client located at `lib/auth-client.js` and the main authentication logic at `lib/auth.js`. The API route for authentication is at `app/api/auth/[...all]/route.js`.
