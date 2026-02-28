# 🛡️ Secure Document Vault (Enterprise Edition)

A premium, enterprise-grade full-stack web application designed for securely storing and managing authenticated user documents. This project is built using modern web development practices and state-of-the-art technologies, providing a seamless and highly secure file management experience with a professional-grade UI.

---

## 🚀 Key Features

- **User Authentication**: Secure user registration and login implemented with `passport-local` and session-based authentication.
- **Document Management**: Users can list, view, and organize their personal documents.
- **Secure Previews**: Inline document previewing using a dedicated `/api/documents/:id/preview` endpoint for images and PDFs, ensuring secure browser rendering without auto-downloading.
- **File Uploads**: Supports secure file uploads (up to 10MB) handled by `multer`. Uploads are safely stored on the server's local filesystem in the `uploads/` directory.
- **Interactive Navigation**: Fully functional sidebar navigation including Dashboard, Documents, and Settings, plus sidebar-integrated Upload triggers.
- **Secure File Download & Deletion**: Only the authenticated owner can download or permanently delete their documents from the file system and database.
- **Modern UI**: A responsive, modern interface built with React, Vite, Tailwind CSS, and Radix UI components.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React 18, built with Vite for fast HMR.
- **Styling**: Tailwind CSS + `tailwindcss-animate`.
- **UI Components**: Radix UI (accessible primitives) and Lucide React (icons).
- **Data Fetching & State**: `@tanstack/react-query` & `wouter` for routing.

### Backend (Server)
- **Runtime & Web Framework**: Node.js & Express 5.
- **Authentication**: Passport.js for session management, mapped to a PostgreSQL session store (`connect-pg-simple`).
- **File Parsing**: `multer` middleware handles multipart/form-data for uploads.
- **Database & ORM**: PostgreSQL database interacted via Drizzle ORM (`drizzle-orm` & `drizzle-zod` for type-safety).

### Shared Schemas
- Typescript definitions and Zod schemas inside `shared/schema.ts` ensure synchronized typing across the frontend and backend architectures.

---

## 🔄 Workflow & Operations Overview

1. **Sign Up / Login**:
   - A prospective user hits the frontend authentication layout.
   - Using the Express API (`/api/register` or `/api/login`), credentials are verified and a session cookie is securely established.

2. **Uploading a File**:
   - Through the React frontend, dragging physically or selecting a file hits the `/api/documents` `POST` route.
   - `multer` intercepts the request, validates the size (max 10MB), and saves the file on the backend into configured `process.cwd()/uploads/` directory with a cryptographically secure (`randomUUID`) filename.
   - A database entry is created within the `documents` PostgreSQL table tying the file's ID, Size, MIME type, and original name to the uploading User's ID.

3. **Viewing & Previewing Documents**:
   - The React client uses `react-query` to pull documents metadata on the Dashboard.
   - For images and PDFs, a dedicated `preview` endpoint (`/api/documents/:id/preview`) serves the files with `Content-Disposition: inline` headers for seamless browser rendering.
   - For all other types, or when explicitly requested, the `download` endpoint triggers a secure file retrieval.

4. **Deleting a Document**:
   - Authorized deletion drops the metadata reference from the `documents` table, while simultaneously utilizing `fs.unlink()` to physically purge the file from the disk to retain privacy and free up storage.

---

## 📦 Project Structure

```text
Secure-Document-Vault/
├── client/          # React frontend code (Pages, UI components, Hooks)
├── server/          # Node.js backend (Express routes, Auth configuration, Storage handlers)
├── shared/          # Universal data models (Zod schemas, Drizzle table structures)
├── uploads/         # Server-side persistent storage folder for files
├── package.json     # Node Dependencies & NPM scripts
└── drizzle.config.ts # Configuration for Drizzle Kit & migrations
```

---

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 20.x or higher)
- A running instance of PostgreSQL (Neon, local, or equivalent setup).

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   Create a `.env` file in the root directory mapping essential configurations:
   ```env
   DATABASE_URL=postgres://user:pass@host:5432/db_name
   SESSION_SECRET=your_secure_session_secret_key
   ```

3. **Initialize the Database**:
   Push the schema to your Postgres instance using Drizzle ORM:
   ```bash
   npm run db:push
   ```

4. **Start the Application**:
   Run the development environment (which concurrently launches the backend server with auto-restart and the Vite client):
   ```bash
   npm run dev
   ```

5. **Access the App**:
   Navigate to `http://localhost:5000` (or the port defined by your environment) in your web browser.
