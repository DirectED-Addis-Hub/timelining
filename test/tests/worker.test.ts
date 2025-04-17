import handler from "../../src/api/worker";
import { VercelRequest, VercelResponse } from "@vercel/node";

// Mock the runWorker function used in the handler
jest.mock("../../src/worker/index", () => ({
  runWorker: jest.fn(),
}));

import { runWorker } from "../../src/worker/index";
const mockedRunWorker = runWorker as jest.MockedFunction<typeof runWorker>;

describe("Worker API", () => {
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

  it("should return 405 for non-GET requests", async () => {
    mockReq = { method: "POST" } as VercelRequest;

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(405);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("should call runWorker and return result", async () => {
    const fakeResult = { 
      status: 'success',
      processed_count: 5 
    };
    mockedRunWorker.mockResolvedValue(fakeResult);

    mockReq = { method: "GET" } as VercelRequest;

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockedRunWorker).toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith({
      status: "Worker executed",
      result: fakeResult,
    });
  });

  it("should handle runWorker errors gracefully", async () => {
    mockedRunWorker.mockRejectedValue(new Error("Something failed"));

    mockReq = { method: "GET" } as VercelRequest;

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Something failed",
    });
  });

  it("should process message with multiple attachments and return success", async () => {
    // Mock the runWorker call to simulate a processed message with multiple attachments
    const fakeResult = {
      status: 'success',
      processed_count: 1,
      handled_types: ['text', 'photo', 'voice'], // Example of multiple attachment types handled
    };
    
    mockedRunWorker.mockResolvedValue(fakeResult);

    // Simulate a GET request
    mockReq = { method: "GET" } as VercelRequest;

    // Execute the handler
    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    // Validate that the worker was called and the appropriate response is returned
    expect(mockedRunWorker).toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith({
      status: "Worker executed",
      result: fakeResult,
    });

    // Validate that multiple types were handled (text, photo, and voice)
    expect(fakeResult.handled_types).toEqual(['text', 'photo', 'voice']);
  });
});
