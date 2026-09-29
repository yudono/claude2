export const RESERVED_NAMES = new Set([
  'env',
  'alias',
  'ls',
  'list',
  'rm',
  'remove',
  'doctor',
  'help',
  'version',
]);

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

export class UsageError extends Error {}

export function validateAccountName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new UsageError('Account name is required.');
  }
  if (name === '.' || name === '..') {
    throw new UsageError(`"${name}" is not a valid account name.`);
  }
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) {
    throw new UsageError(`"${name}" must not contain path separators.`);
  }
  if (!NAME_PATTERN.test(name)) {
    throw new UsageError(
      `"${name}" is not a valid account name. Use 1-32 characters: letters, digits, ".", "_", "-", starting with a letter or digit.`
    );
  }
  if (RESERVED_NAMES.has(name)) {
    throw new UsageError(
      `"${name}" is a reserved command. Pick another account name.`
    );
  }
  return name;
}
