import { GET, POST } from '@/app/api/story/worker/route';
import { runWorker } from '@/services/worker';

// Mock the runWorker function used in the GET
jest.mock("@/services/worker/index", () => ({
  runWorker: jest.fn(),
}));

const mockedRunWorker = runWorker as jest.MockedFunction<typeof runWorker>;

describe("API /api/worker", () => {
  beforeEach(() => {
    mockedRunWorker.mockReset();
  });

  it('should return 405 for non-GET requests', async () => {
    const req = new Request('http://localhost/api/worker', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(405);
    const text = await res.text();
    expect(text).toBe('Method Not Allowed');
  });

  it("should call runWorker and return result", async () => {
    const fakeResult = { 
      status: 'success',
      processed_count: 5 
    };
    mockedRunWorker.mockResolvedValue(fakeResult);

    const req = new Request('http://localhost/api/worker', { method: 'GET' });
    const res = await GET();

    expect(mockedRunWorker).toHaveBeenCalled();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      status: 'Worker executed',
      result: fakeResult,
    });
  });

  it("should handle runWorker errors gracefully", async () => {
    mockedRunWorker.mockRejectedValue(new Error("Something failed"));

    mockReq = { method: "GET" } as VercelRequest;

    await GET(mockReq as VercelRequest, mockRes as VercelResponse);

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

    // Execute the GET
    await GET(mockReq as VercelRequest, mockRes as VercelResponse);

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
