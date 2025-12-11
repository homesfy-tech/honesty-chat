import bcrypt from 'bcrypt';
import { query } from '../db/postgresql.js';

/**
 * User model for PostgreSQL
 */
export class User {
  /**
   * Create a new user
   */
  static async create({ username, password, email, role = 'user' }) {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await query(
      `INSERT INTO users (username, password_hash, email, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, created_at, updated_at`,
      [username, passwordHash, email, role]
    );
    
    return result.rows[0];
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const result = await query(
      'SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE username = $1',
      [username]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1',
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
    let paramCount = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(updates.role);
    }
    if (updates.password !== undefined) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, role, created_at, updated_at`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Delete user
   */
  static async delete(id) {
    await query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }
}

