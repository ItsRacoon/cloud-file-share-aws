/**
 * Content type whitelist and validation utilities
 */
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm'
];

/**
 * Validate content type against whitelist
 * @param {string} contentType - MIME type to validate
 * @returns {boolean} - True if allowed
 */
function isAllowedContentType(contentType) {
  if (!contentType) return false;
  
  // Check exact match
  if (ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return true;
  }
  
  // Check wildcard patterns (image/*, text/*, video/*)
  const baseType = contentType.split('/')[0];
  return ['image', 'text', 'video'].includes(baseType);
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} - True if within limit
 */
function isValidFileSize(size, maxSize) {
  return size > 0 && size <= maxSize;
}

/**
 * Sanitize filename to prevent path traversal
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
}

module.exports = {
  isAllowedContentType,
  isValidFileSize,
  sanitizeFilename,
  ALLOWED_CONTENT_TYPES
};
