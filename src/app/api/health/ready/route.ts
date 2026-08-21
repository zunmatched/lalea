import { pool } from "@/db/client";
export async function GET() {
  try { await pool.query("select 1"); return Response.json({ status: "ready" }); }
  catch { return Response.json({ status: "unavailable" }, { status: 503 }); }
}

