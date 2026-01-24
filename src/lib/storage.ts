import { mkdir, writeFile, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';
const EVIDENCE_DIR = `${UPLOAD_DIR}/evidence`;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export interface UploadResult {
  success: boolean;
  filename?: string;
  path?: string;
  url?: string;
  error?: string;
}

/**
 * Ensure a directory exists, creating it if necessary.
 */
async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate a unique filename.
 */
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
}

/**
 * Validate file type.
 */
function isAllowedType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

/**
 * Upload an evidence file for an assessment.
 */
export async function uploadEvidenceFile(
  cohortId: string,
  learnerId: string,
  file: File
): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Validate file type
  if (!isAllowedType(file.type)) {
    return {
      success: false,
      error: 'File type not allowed. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX',
    };
  }

  try {
    // Create directory structure
    const dirPath = path.join(process.cwd(), EVIDENCE_DIR, cohortId, learnerId);
    await ensureDir(dirPath);

    // Generate unique filename
    const filename = generateFilename(file.name);
    const filePath = path.join(dirPath, filename);

    // Write file
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Return relative URL path
    const url = `/uploads/evidence/${cohortId}/${learnerId}/${filename}`;

    return {
      success: true,
      filename,
      path: filePath,
      url,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file',
    };
  }
}

/**
 * Delete an evidence file.
 */
export async function deleteEvidenceFile(fileUrl: string): Promise<boolean> {
  try {
    // Convert URL to file path
    const relativePath = fileUrl.replace(/^\//, '');
    const fullPath = path.join(process.cwd(), 'public', relativePath);

    if (existsSync(fullPath)) {
      await unlink(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

/**
 * List evidence files for a learner.
 */
export async function listEvidenceFiles(
  cohortId: string,
  learnerId: string
): Promise<string[]> {
  try {
    const dirPath = path.join(process.cwd(), EVIDENCE_DIR, cohortId, learnerId);

    if (!existsSync(dirPath)) {
      return [];
    }

    const files = await readdir(dirPath);
    return files.map((file) => `/uploads/evidence/${cohortId}/${learnerId}/${file}`);
  } catch (error) {
    console.error('List error:', error);
    return [];
  }
}

/**
 * Get file info from URL.
 */
export function getFileInfoFromUrl(url: string): {
  filename: string;
  extension: string;
  isImage: boolean;
  isPdf: boolean;
} {
  const filename = path.basename(url);
  const extension = path.extname(url).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
  const isPdf = extension === '.pdf';

  return {
    filename,
    extension,
    isImage,
    isPdf,
  };
}
