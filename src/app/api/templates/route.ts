import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/template";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: listTemplates(),
  });
}
