## Packages
react-dropzone | Drag and drop file uploads
framer-motion | Page transitions and UI animations
date-fns | Date formatting utilities

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  sans: ["var(--font-sans)"],
}
Uploads expect multipart/form-data to POST /api/documents with 'file' field.
Authentication uses Replit's API handling logic.
