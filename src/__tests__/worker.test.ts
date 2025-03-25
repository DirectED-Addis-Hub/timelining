import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from "../api/worker";
import { runWorker } from "../scripts/workerScript";

// Mock the logger
jest.mock("winston", () => ({
    createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
    }),
}));

// Mock worker function
jest.mock("../scripts/workerScript", () => ({
    runWorker: jest.fn().mockResolvedValue({ status: "success", processed_count: 5 }),
}));

// Mock request/response factory
const createMockReqRes = (method: string) => {
    const req = {
        method,
        query: {},
        cookies: {},
        body: {}
    } as VercelRequest;

    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as unknown as VercelResponse;

    return { req, res };
};

describe("API /api/worker", () => {
    it("should return 405 for non-GET requests", async () => {
        const { req, res } = createMockReqRes('POST');
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" });
    });

    it("should trigger the worker and return success", async () => {
        const { req, res } = createMockReqRes('GET');
        await handler(req, res);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            result: { status: "success", processed_count: 5 },
            schedule_updated: false
        });
    });

    it("should return 500 on worker failure", async () => {
        jest.mocked(runWorker).mockRejectedValue(new Error("Worker failure"));
        const { req, res } = createMockReqRes('GET');
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Worker failure" });
    });
});
