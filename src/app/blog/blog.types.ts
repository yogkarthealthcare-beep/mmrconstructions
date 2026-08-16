export interface BlogContentSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  featuredImage: string;
  author: string;
  publishDate: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  content: BlogContentSection[];
}
