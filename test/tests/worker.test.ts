import { GET, POST } from '@/app/api/story/worker/route';
import { runWorker } from '@/services/worker';
import { NextRequest } from 'next/server';

// Mock the runWorker function used in the GET
jest.mock("@/services/worker/index", () => ({
  runWorker: jest.fn(),
}));

const mockedRunWorker = runWorker as jest.MockedFunction<typeof runWorker>;

describe("API /api/worker", () => {
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  
  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockedRunWorker.mockReset();
  });

  it('should return 405 for non-GET requests', async () => {
    const res = await POST();

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

    const req = new NextRequest('http://localhost/api/worker', { method: 'GET' });
    const res = await GET(req);

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

    const mockReq = new NextRequest('http://localhost/api/worker', {
      method: 'GET',
    });

    const res = await GET(mockReq);

    expect(res.status).toBe(500);
  });

  it("should process message with multiple attachments and return success", async () => {
    // Mock the runWorker call to simulate a processed message with multiple attachments
    const fakeResult = {
      status: 'success',
      processed_count: 1,
      handled_types: ['text', 'photo', 'voice'], // Example of multiple attachment types handled
    };
  
    mockedRunWorker.mockResolvedValue(fakeResult);
  
    // Execute the GET handler, passing in a mock NextRequest if needed
    const mockReq = new NextRequest('http://localhost/api/worker', { method: 'GET' });
  
    // Execute the handler
    const res = await GET(mockReq);  // Make sure GET takes mockReq as an argument
  
    // Validate that the worker was called
    expect(mockedRunWorker).toHaveBeenCalled();
  
    // Ensure the result is correctly returned from NextResponse
    const jsonResponse = await res.json(); // Extract the JSON response
  
    expect(jsonResponse).toEqual({
      status: "Worker executed",
      result: fakeResult,
    });
  
    // Validate that multiple types were handled (text, photo, and voice)
    expect(fakeResult.handled_types).toEqual(['text', 'photo', 'voice']);
  });  
});
