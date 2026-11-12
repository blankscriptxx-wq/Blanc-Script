import { NextResponse } from "next/server";
import { getDownloadUrl } from "@/lib/data/media";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const url = await getDownloadUrl(id);
    if (!url) {
      return NextResponse.json({ error: "Not available" }, { status: 404 });
    }
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
}
