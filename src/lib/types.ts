// Notion API Types for Bamboo Bicycle Course

export interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  cover?: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  properties?: Record<string, NotionProperty>;
}

export interface NotionProperty {
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string; color: string };
  status?: { name: string; color: string };
  date?: { start: string; end?: string };
  url?: string;
}

export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
  // Block-specific content
  paragraph?: RichTextContent;
  heading_1?: RichTextContent;
  heading_2?: RichTextContent;
  heading_3?: RichTextContent;
  bulleted_list_item?: RichTextContent;
  numbered_list_item?: RichTextContent;
  to_do?: ToDoContent;
  toggle?: RichTextContent;
  callout?: CalloutContent;
  quote?: RichTextContent;
  divider?: Record<string, never>;
  table?: TableContent;
  table_row?: TableRowContent;
  code?: CodeContent;
  image?: MediaContent;
  file?: FileContent;
  pdf?: FileContent;
  child_page?: { title: string };
  link_to_page?: { page_id: string };
  bookmark?: { url: string; caption?: RichText[] };
  embed?: { url: string; caption?: RichText[] };
  video?: MediaContent;
  audio?: MediaContent;
  column_list?: Record<string, never>;
  column?: Record<string, never>;
}

export interface RichTextContent {
  rich_text: RichText[];
  color?: string;
}

export interface RichText {
  type: string;
  plain_text: string;
  href?: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
}

export interface ToDoContent {
  rich_text: RichText[];
  checked: boolean;
}

export interface CalloutContent {
  rich_text: RichText[];
  icon?: { type: string; emoji?: string };
  color: string;
}

export interface TableContent {
  table_width: number;
  has_column_header: boolean;
  has_row_header: boolean;
}

export interface TableRowContent {
  cells: RichText[][];
}

export interface CodeContent {
  rich_text: RichText[];
  language: string;
}

export interface MediaContent {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string; expiry_time: string };
  caption?: RichText[];
}

export interface FileContent {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string; expiry_time: string };
  name?: string;
  caption?: RichText[];
}

// Course-specific types
export interface Module {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  lessons: Lesson[];
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  moduleId: string;
  icon?: string;
  duration?: string;
  order: number;
}

export interface CourseNavigation {
  modules: Module[];
  resources: NavigationLink[];
  handbooks: NavigationLink[];
}

export interface NavigationLink {
  id: string;
  title: string;
  icon?: string;
  url: string;
}

// Course types for multi-course dashboard
export interface Course {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
  notionNavId: string;
  notionDatabaseId?: string;
  notionApiKey?: string; // Optional API key for multi-workspace support
  duration: string;
  level: string;
  accreditation?: string;
  image?: string;
  enabled: boolean;
  isHandbook?: boolean; // Flag for handbook-style rendering (sidebar TOC + sections)
}

// Handbook types for manual-style courses
export interface HandbookSection {
  id: string;
  name: string;
  pageRange: string;
  order: number;
  images: HandbookImage[];
  blocks?: NotionBlock[];  // All content blocks from Notion for full rendering
  // Urban Arrow style properties
  section?: string;      // e.g., "1.0", "1.1", "2.0"
  chapter?: string;      // e.g., "Introduction", "Getting Started"
  slug?: string;         // URL-friendly identifier
  icon?: string;         // Emoji or icon
  hasVideo?: boolean;    // Whether section has video content
  estTime?: string;      // Estimated reading time e.g., "3 min"
}

// Chapter grouping for sidebar navigation
export interface ChapterGroup {
  name: string;
  color: ChapterColorScheme;
  sections: HandbookSection[];
}

// Color scheme for chapter styling
export interface ChapterColorScheme {
  bg: string;      // Background color class
  border: string;  // Border color class
  text: string;    // Text color class
  solid: string;   // Solid background for active states
}

// Predefined chapter colors
export const CHAPTER_COLORS: Record<string, ChapterColorScheme> = {
  'Introduction': { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', solid: 'bg-blue-600' },
  'Getting Started': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', solid: 'bg-green-600' },
  'Frame Building': { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', solid: 'bg-orange-600' },
  'Finishing': { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', solid: 'bg-purple-600' },
  'Reference': { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-700', solid: 'bg-gray-600' },
};

export interface HandbookImage {
  url: string;
  caption: string;
}

export interface CourseWithProgress extends Course {
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

// Progress tracking types
export interface ProgressState {
  completedLessons: Set<string>;
  lastVisited?: string;
  lastVisitedAt?: string;
}

export interface ProgressContextType {
  completedLessons: string[];
  isComplete: (lessonId: string) => boolean;
  markComplete: (lessonId: string) => void | Promise<void>;
  markIncomplete: (lessonId: string) => void | Promise<void>;
  toggleComplete: (lessonId: string) => void | Promise<void>;
  getProgress: () => { completed: number; total: number; percentage: number };
  totalLessons: number;
  setTotalLessons: (count: number) => void;
  // Backend sync status
  isSyncing?: boolean;
  syncError?: string | null;
  refresh?: () => Promise<void>;
}
