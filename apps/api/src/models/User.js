import bcrypt from 'bcrypt';
import { query } from '../db/mysql.js';

/**
 * User model for MySQL
 */
export class User {
  /**
   * Create a new user
   */
  static async create({ username, password, email, role = 'user' }) {
    const passwordHash = await bcrypt.hash(password, 10);
    
    await query(
      `INSERT INTO users (username, password_hash, email, role)
       VALUES (?, ?, ?, ?)`,
      [username, passwordHash, email, role]
    );
    
    // MySQL doesn't support RETURNING, so fetch the inserted row
    const result = await query('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = LAST_INSERT_ID()', []);
    return result.rows[0];
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const result = await query(
      'SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE username = ?',
      [username]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Verify password
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Get all users (without passwords)
   */
  static async findAll() {
    const result = await query(
      'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    
    return result.rows;
  }

  /**
   * Update user
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.email !== undefined) {
      fields.push(`email = ?`);
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push(`role = ?`);
      values.push(updates.role);
    }
    if (updates.password !== undefined) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      fields.push(`password_hash = ?`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // MySQL doesn't support RETURNING, so fetch the updated row
    const result = await query('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?', [id]);
    return result.rows[0] || null;
  }

  /**
   * Delete user
   */
  static async delete(id) {
    await query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }
}
