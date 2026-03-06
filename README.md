# Ecommerce Project 3

A modern, high-performance e-commerce platform built with the latest web technologies. This project focuses on a seamless user experience, responsive design, and robust authentication.

## 🚀 Key Features

- **Next.js 15+ & Turbopack**: Blazing fast development and production builds.
- **Tailwind CSS v4**: Utilizing the latest CSS-in-JS capabilities with `@theme` and direct CSS configuration.
- **Robust Authentication**: Secure user management and session handling via `better-auth`.
- **Prisma ORM**: Type-safe database interactions with PostgreSQL.
- **Interactive UI**: 
  - Custom `Stack` component with Framer Motion (swipe-to-back, drag-and-drop, 3D perspective).
  - High-quality icons via `lucide-react`.
  - Accessible components from `shadcn/ui`.
- **Fully Responsive**: Optimized for all screen sizes, from mobile to ultra-wide displays.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animation**: [Motion (Framer Motion)](https://motion.dev/)
- **Auth**: [Better-Auth](https://better-auth.com/)
- **Database**: [Prisma](https://www.prisma.io/) with PostgreSQL
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## 🏁 Getting Started

### 1. Prerequisites
Ensure you have `node` and `npm` installed on your machine.

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Database Setup
Create a `.env` file in the root directory and add your database connection string:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce_db"
```
Then, push the schema to your database:
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the application in action.

## 📁 Project Structure

- `app/`: Next.js App Router (pages, API routes, layouts).
- `component/`: Main UI features (Hero, Stack, FeatureProducts, etc.).
- `components/ui/`: Reusable `shadcn/ui` atomic components.
- `lib/`: Utility functions, authentication configuration, and custom hooks.
- `prisma/`: Database schema definition.
- `types/`: Global TypeScript interfaces and types.

## 📜 Available Scripts

- `npm run dev`: Starts the development server with Turbopack.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npx prisma studio`: Opens a GUI to view and edit your database data.

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the platform.

---

Built with ❤️ using Next.js and Tailwind CSS.
