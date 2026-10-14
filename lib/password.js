const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const PREFIX = 'crm$bcrypt-sha256$v1$';
const digest = password => crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');

function hashPassword(password) {
  const value = String(password || '');
  if (!value || value.startsWith(PREFIX)) return value;
  return PREFIX + bcrypt.hashSync(digest(value), 10);
}

function verifyPassword(password, stored) {
  const value = String(stored || '');
  if (!value || !String(password || '')) return false;
  if (value.startsWith(PREFIX)) {
    try { return bcrypt.compareSync(digest(password), value.slice(PREFIX.length)); }
    catch { return false; }
  }
  // Rolling-release compatibility only; remove after the stored-credential migration.
  const left = Buffer.from(String(password)), right = Buffer.from(value);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = { PREFIX, hashPassword, verifyPassword };
