import prisma from "@/utils/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function connect() {
    const user = await currentUser();

    if (!user || !user.username) {
        return redirect("/sign-in");
    }

    const match = await prisma.user.upsert({
        where: {
            clerkId: user.id as string,
        },
        update: {
            email: user.emailAddresses[0].emailAddress,
            name: user.username,
        },
        create: {
            clerkId: user.id,
            email: user.emailAddresses[0].emailAddress,
            name: user.username,
        },
    });


    redirect("/dashboard");
}
