import { query } from '../db/postgresql.js';
import crypto from 'crypto';

/**
 * Session model for PostgreSQL
 */
export class Session {
  /**
   * Create a new session
   */
  static async create(userId, expiresAt) {
    const token = crypto.randomBytes(32).toString('hex');
    
    const result = await query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token, expires_at, created_at`,
      [userId, token, expiresAt]
    );
    
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
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Delete session by token
   */
  static async deleteByToken(token) {
    await query('DELETE FROM sessions WHERE token = $1', [token]);
    return true;
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired() {
    const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
    return result.rowCount;
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteByUserId(userId) {
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    return true;
  }
}

