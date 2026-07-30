import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/auth/supabase-service";

/**
 * Used by uptime monitoring (reviewed ARCHITECTURE.md §12). Checks DB
 * connectivity via a trivial query — not a full dependency graph check,
 * that's out of scope for Phase 2.
 */
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("stores").select("id").limit(1);

    if (error) {
      return NextResponse.json({ status: "error", detail: error.message }, { status: 503 });
    }

    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 503 },
    );
  }
}
