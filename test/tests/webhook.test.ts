import handler from "../../src/api/webhook"; // Import the Vercel function
import { VercelRequest, VercelResponse } from "@vercel/node";

// Mock Redis client
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    lpush: jest.fn().mockResolvedValue(1), // Simulate successful Redis push
  })),
}));

// Mock Axios for Telegram API
jest.mock("axios", () => ({
  create: jest.fn(() => ({
    post: jest.fn().mockResolvedValue({ data: { ok: true } })
  })),
  post: jest.fn().mockResolvedValue({ data: { ok: true } }),
}));

describe("Telegram Webhook API", () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRes = {
      json: jsonMock,
      status: statusMock,
    } as unknown as VercelResponse;
  });

  it("should return 405 for non-POST requests", async () => {
    mockReq = { method: "GET" } as VercelRequest;

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(405);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("should return status 'ignored' for invalid messages", async () => {
    mockReq = {
      method: "POST",
      body: {},
    } as VercelRequest;

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith({ status: "ignored" });
  });

  it("should queue a valid message and return 'ok'", async () => {
    mockReq = {
      method: "POST",
      body: {
        message: {
          chat: { id: 12345 },
          text: "Hello",
        },
      },
    } as VercelRequest;

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith({ status: "ok" });
  });
});
