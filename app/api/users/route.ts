import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/utils/db";
import { Role } from "@/app/generated/prisma/enums";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, role } = body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["ADMINISTRATOR", "DOCTOR", "PATIENT"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMINISTRATOR, DOCTOR, or PATIENT" },
        { status: 400 }
      );
    }

    // Create user in Clerk
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: password,
      username: username,
      publicMetadata: {
        role: role,
      },
    });

    // Create user in database
    const dbUser = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: email,
        name: username,
        role: role as Role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: dbUser.id,
          clerkId: dbUser.clerkId,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    // Handle Clerk-specific errors
    if (error && typeof error === "object" && "errors" in error) {
      const clerkError = error as {
        errors: Array<{ message: string; code: string }>;
      };
      const firstError = clerkError.errors[0];

      if (firstError?.code === "form_identifier_exists") {
        return NextResponse.json(
          { error: "A user with this email or username already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: firstError?.message || "Failed to create user in Clerk" },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "A user with this email already exists in the database" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
