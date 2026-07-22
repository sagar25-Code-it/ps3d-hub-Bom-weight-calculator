// Vercel Serverless Function — runs server-side only.
// Reads contact details from environment variables (set in the Vercel
// dashboard for production, or in a local .env file for `vercel dev`).
// This is the ONLY place personal contact details exist in this project;
// they are never hardcoded in index.html or committed to git.

export default function handler(req, res) {
  // Cache at the edge for 5 minutes since this data changes rarely.
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");

  res.status(200).json({
    name: process.env.CONTACT_NAME || "",
    brand: process.env.CONTACT_BRAND || "",
    phone: process.env.CONTACT_PHONE || "",
    email: process.env.CONTACT_EMAIL || "",
    location: process.env.CONTACT_LOCATION || "",
  });
}
