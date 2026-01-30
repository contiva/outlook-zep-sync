import { NextResponse } from "next/server";
import { createZepTimeEntry, ZepTimeEntry } from "@/lib/zep-api";

interface RequestBody {
  zepUrl: string;
  token: string;
  entries: ZepTimeEntry[];
}

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const { zepUrl, token, entries } = body;

  if (!zepUrl || !token || !entries?.length) {
    return NextResponse.json(
      { error: "zepUrl, token and entries required" },
      { status: 400 }
    );
  }

  try {
    const results = await Promise.allSettled(
      entries.map((entry) => createZepTimeEntry(zepUrl, token, entry))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      message: `${succeeded} Einträge erstellt, ${failed} fehlgeschlagen`,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("ZEP timeentry creation error:", error);
    return NextResponse.json(
      { error: "Failed to create time entries" },
      { status: 500 }
    );
  }
}
