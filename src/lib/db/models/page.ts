// Model for Page
export interface Page {
  url: string;
  title: string;
  content: string; // Will hold the page content, but you could just use metadata (or store in separate node)
}

// Model for Page View
export interface PageView {
  pageUrl: string;
  timestamp: string;
  userId?: string; // Optional, for future expansion (who viewed the page)
}
