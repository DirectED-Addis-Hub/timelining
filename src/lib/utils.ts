export function handleError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

export function getCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {

  if (origin && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  console.warn(`Blocked CORS request from disallowed origin: ${origin}`);
  // Return an empty object, but make sure all values are still strings
  return {};
}
