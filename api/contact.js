const CONTACT_FIELDS = ["CONTACT_NAME", "CONTACT_BRAND", "CONTACT_PHONE", "CONTACT_EMAIL", "CONTACT_LOCATION"];

function clean(value, maxLength = 160) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength)
    : "";
}

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const values = Object.fromEntries(CONTACT_FIELDS.map((key) => [key, clean(process.env[key])]));
  response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=86400");
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  return response.status(200).json({
    name: values.CONTACT_NAME,
    brand: values.CONTACT_BRAND,
    phone: values.CONTACT_PHONE,
    email: values.CONTACT_EMAIL,
    location: values.CONTACT_LOCATION,
  });
}
