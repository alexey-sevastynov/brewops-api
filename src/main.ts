import type { Request, Response } from "express";
import type express from "express";
import { bootstrap } from "./bootstrap";

const serverPromise = bootstrap();

/**
 * Handler function for serverless deployment on Vercel Production.
 * It initializes the server if needed and forwards incoming requests
 * to either the Express server or the NestJS application instance.
 */
export default async function handler(req: Request, res: Response) {
    const server = await serverPromise;

    if (typeof server === "function") {
        server(req, res);
    } else {
        const instance = server.getHttpAdapter().getInstance() as express.Express;

        instance(req, res);
    }
}
