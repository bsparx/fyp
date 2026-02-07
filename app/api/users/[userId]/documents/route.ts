import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: {
          userId,
          type: "PATIENT",
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          type: true,
          patientDataType: true,
          isIngested: true,
          createdAt: true,
          content: true,
        },
      }),
      prisma.document.count({
        where: {
          userId,
          type: "PATIENT",
        },
      }),
    ]);

    return NextResponse.json({
      documents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching user documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
