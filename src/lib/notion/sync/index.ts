/**
 * Notion Sync Module
 *
 * Exports all sync-related functionality for curriculum synchronization.
 */

export {
  syncCurriculum,
  getSyncStatus,
  isSyncRunning,
  getLastSyncTime,
  type SyncOptions,
  type SyncResult,
  type SyncError
} from './curriculum-sync';

export {
  transformBlocks,
  extractPlainText,
  calculateTotalDuration,
  extractOcnCriteria,
  type TransformedBlock
} from './block-transformer';
