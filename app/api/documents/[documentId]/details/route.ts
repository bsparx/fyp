import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import type { Document } from "@/app/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        createdAt: true,
        isIngested: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get parent chunks count
    const parentChunksCount = await prisma.parentChunk.count({
      where: { documentId },
    });

    // Get child chunks count
    const childChunksCount = await prisma.ragChunk.count({
      where: { documentId },
    });

    // Parse content to get files
    const files = [];
    try {
      const content = document.content || "";
      if (typeof content === "string") {
        const parsedContent = JSON.parse(content);
        if (parsedContent.files && Array.isArray(parsedContent.files)) {
          files.push(...parsedContent.files);
        }
      }
    } catch (e) {
      console.error("Error parsing document content:", e);
    }

    return NextResponse.json({
      parentChunks: parentChunksCount,
      childChunks: childChunksCount,
      files,
    });
  } catch (error) {
    console.error("Error fetching document details:", error);
    return NextResponse.json(
      { error: "Failed to fetch document details" },
      { status: 500 }
    );
  }
}
