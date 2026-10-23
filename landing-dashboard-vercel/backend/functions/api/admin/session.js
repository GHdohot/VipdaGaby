import { json } from "../../_lib/admin-auth.js";

export async function onRequestGet({ data }) {
  return json({ csrf: data.adminSession.csrf });
}
