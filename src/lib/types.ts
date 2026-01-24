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
}

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
