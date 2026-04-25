"use server"

import prisma from "@/utils/db"
import { Pinecone } from "@pinecone-database/pinecone"
import neo4j from "neo4j-driver"
import { clerkClient } from "@clerk/nextjs/server"

export interface SystemStatus {
    database: { connected: boolean; latencyMs: number; message: string }
    pinecone: { connected: boolean; indexName: string | null; vectorCount: number | null; message: string }
    neo4j: { connected: boolean; nodeCount: number | null; message: string }
    clerk: { connected: boolean; userCount: number | null; message: string }
    environment: {
        databaseUrl: boolean
        pineconeApiKey: boolean
        pineconeIndex: boolean
        neo4jUri: boolean
        neo4jUser: boolean
        clerkSecretKey: boolean
        openaiKey: boolean
        googleAiKey: boolean
    }
}

export async function getSystemStatus(): Promise<SystemStatus> {
    // Database check
    let dbStatus = { connected: false, latencyMs: 0, message: "Not connected" }
    const dbStart = Date.now()
    try {
        await prisma.$queryRaw`SELECT 1`
        dbStatus = { connected: true, latencyMs: Date.now() - dbStart, message: "Connected" }
    } catch (e) {
        dbStatus = { connected: false, latencyMs: 0, message: "Connection failed" }
    }

    // Pinecone check
    let pineconeStatus = { connected: false, indexName: null as string | null, vectorCount: null as number | null, message: "Not configured" }
    try {
        if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
            const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
            const index = pc.index(process.env.PINECONE_INDEX_NAME, process.env.PINECONE_INDEX_HOST)
            const stats = await index.describeIndexStats()
            pineconeStatus = {
                connected: true,
                indexName: process.env.PINECONE_INDEX_NAME,
                vectorCount: stats.totalRecordCount ?? null,
                message: "Connected",
            }
        }
    } catch (e) {
        pineconeStatus = { connected: false, indexName: null, vectorCount: null, message: "Connection failed" }
    }

    // Neo4j check
    let neo4jStatus = { connected: false, nodeCount: null as number | null, message: "Not configured" }
    try {
        const uri = process.env.NEO4J_URI
        const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME
        const password = process.env.NEO4J_PASSWORD
        if (uri && user && password) {
            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session()
            try {
                const result = await session.run("MATCH (n) RETURN count(n) as count LIMIT 1")
                const count = result.records[0]?.get("count")?.toNumber?.() ?? 0
                neo4jStatus = { connected: true, nodeCount: count, message: "Connected" }
            } finally {
                await session.close()
                await driver.close()
            }
        }
    } catch (e) {
        neo4jStatus = { connected: false, nodeCount: null, message: "Connection failed" }
    }

    // Clerk check
    let clerkStatus = { connected: false, userCount: null as number | null, message: "Not configured" }
    try {
        if (process.env.CLERK_SECRET_KEY) {
            const clerk = await clerkClient()
            const count = await clerk.users.getCount()
            clerkStatus = { connected: true, userCount: count, message: "Connected" }
        }
    } catch (e) {
        clerkStatus = { connected: false, userCount: null, message: "Connection failed" }
    }

    return {
        database: dbStatus,
        pinecone: pineconeStatus,
        neo4j: neo4jStatus,
        clerk: clerkStatus,
        environment: {
            databaseUrl: Boolean(process.env.DATABASE_URL),
            pineconeApiKey: Boolean(process.env.PINECONE_API_KEY),
            pineconeIndex: Boolean(process.env.PINECONE_INDEX_NAME),
            neo4jUri: Boolean(process.env.NEO4J_URI),
            neo4jUser: Boolean(process.env.NEO4J_USER || process.env.NEO4J_USERNAME),
            clerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY),
            openaiKey: Boolean(process.env.OPENAI_API_KEY),
            googleAiKey: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
        },
    }
}
