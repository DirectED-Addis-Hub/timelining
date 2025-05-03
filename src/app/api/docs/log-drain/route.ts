import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log(req)
  return NextResponse.json({req}, { 
    status: 200, 
    headers: { 'x-vercel-verify': '72062fa2aabce4106de99743f55a6b6a4f0ba296' } 
  });
}
  
    // try {
    //     const logs = req.body;

    //     // Assuming logs are an array, where each log contains information like page URL
    //     if (Array.isArray(logs)) {
    //     for (const log of logs) {
    //         // Extract the relevant log data for page views
    //         const { url, timestamp } = log;

    //         // Write the page view data to the Neo4j database
    //         await recordPageView({ pageUrl: url, timestamp });
    //     }
    //     } else {
    //     return res.status(400).json({ message: 'Invalid log format' });
    //     }

    //     return res.status(200).json({ message: 'Logs processed successfully' });
    // } catch (error) {
    //     console.error('Error processing logs:', error);
    //     return res.status(500).json({ message: 'Internal Server Error' });
    // }
