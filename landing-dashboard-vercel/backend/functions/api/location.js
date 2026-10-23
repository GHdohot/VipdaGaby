function validCountry(value) {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : null;
}

export function onRequestGet({ request }) {
  const countryCode = validCountry(request.headers.get("x-vercel-ip-country"));
  return Response.json({ countryCode }, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
