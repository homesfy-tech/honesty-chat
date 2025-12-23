/**
 * Apply Performance Indexes
 * Run this script to add additional database indexes for better performance
 * 
 * Usage: node src/db/apply-performance-indexes.js
 */

import { connectMySQL, query } from './mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyIndexes() {
  try {
    console.log('🔗 Connecting to MySQL...');
    await connectMySQL();
    
    console.log('📊 Applying performance indexes...');
    const indexPath = path.join(__dirname, 'performance-indexes.sql');
    
    if (!fs.existsSync(indexPath)) {
      console.log('ℹ️  No performance-indexes.sql file found. Indexes are already defined in mysql-schema.sql');
      process.exit(0);
    }
    
    const indexSQL = fs.readFileSync(indexPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = indexSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('/*') &&
               trimmed !== '';
      });
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement, []);
          console.log('✅ Applied:', statement.substring(0, 60) + '...');
        } catch (error) {
          // Ignore "already exists" errors
          if (error.code === 'ER_DUP_KEYNAME' || 
              (error.message && error.message.includes('already exists'))) {
            console.log('ℹ️  Already exists:', statement.substring(0, 60) + '...');
            continue;
          }
          console.error('❌ Error applying index:', error.message);
        }
      }
    }
    
    console.log('✅ Performance indexes applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to apply indexes:', error);
    process.exit(1);
  }
}

applyIndexes();
