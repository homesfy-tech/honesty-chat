import { query } from '../db/mysql.js';
import crypto from 'crypto';

/**
 * Session model for MySQL
 */
export class Session {
  /**
   * Create a new session
   */
  static async create(userId, expiresAt) {
    const token = crypto.randomBytes(32).toString('hex');
    
    await query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [userId, token, expiresAt]
    );
    
    // MySQL doesn't support RETURNING, so fetch the inserted row
    const result = await query('SELECT id, user_id, token, expires_at, created_at FROM sessions WHERE id = LAST_INSERT_ID()', []);
    return result.rows[0];
  }

  /**
   * Find session by token
   */
  static async findByToken(token) {
    const result = await query(
      `SELECT s.*, u.username, u.email, u.role
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > NOW()`,
      [token]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Delete session by token
   */
  static async deleteByToken(token) {
    await query('DELETE FROM sessions WHERE token = ?', [token]);
    return true;
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired() {
    const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
    return result.rowCount || 0;
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteByUserId(userId) {
    await query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    return true;
  }
}
