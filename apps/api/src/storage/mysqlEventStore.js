import { query } from '../db/mysql.js';

/**
 * MySQL storage for Events
 */
export async function createEvent(data) {
  await query(
    `INSERT INTO events (type, project_id, microsite, payload, location)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.type,
      data.projectId,
      data.microsite || null,
      JSON.stringify(data.payload || {}),
      JSON.stringify(data.location || null)
    ]
  );
  
  // MySQL doesn't support RETURNING, so get the last insert ID
  const result = await query('SELECT * FROM events WHERE id = LAST_INSERT_ID()', []);
  return result.rows[0];
}

export async function listEvents(filters = {}) {
  let whereConditions = [];
  let params = [];

  if (filters.type) {
    whereConditions.push(`type = ?`);
    params.push(filters.type);
  }

  if (filters.projectId) {
    whereConditions.push(`project_id = ?`);
    params.push(filters.projectId);
  }

  if (filters.microsite) {
    whereConditions.push(`microsite = ?`);
    params.push(filters.microsite);
  }

  if (filters.startDate || filters.endDate) {
    if (filters.startDate && filters.endDate) {
      whereConditions.push(`created_at BETWEEN ? AND ?`);
      params.push(new Date(filters.startDate), new Date(filters.endDate));
    } else if (filters.startDate) {
      whereConditions.push(`created_at >= ?`);
      params.push(new Date(filters.startDate));
    } else if (filters.endDate) {
      whereConditions.push(`created_at <= ?`);
      params.push(new Date(filters.endDate));
    }
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const skip = Number(filters.skip) || 0;
  const limit = Number(filters.limit) || 100;

  // MySQL uses LIMIT offset, count
  const result = await query(
    `SELECT * FROM events ${whereClause}
     ORDER BY created_at DESC
     LIMIT ?, ?`,
    [...params, skip, limit]
  );

  return result.rows.map(row => ({
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  }));
}

export async function getEventById(id) {
  const result = await query(
    'SELECT * FROM events WHERE id = ?',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  };
}

export async function deleteEvent(id) {
  await query('DELETE FROM events WHERE id = ?', [id]);
  return true;
}

export async function recordEvent(data) {
  return await createEvent(data);
}

export async function getEventSummary() {
  // Get event counts by type
  const typeCounts = await query(
    `SELECT type, COUNT(*) as count 
     FROM events 
     GROUP BY type 
     ORDER BY count DESC`
  );

  // Get total events
  const totalResult = await query('SELECT COUNT(*) as total FROM events');
  const total = parseInt(totalResult.rows[0].total, 10);

  // Get events by project
  const projectCounts = await query(
    `SELECT project_id, COUNT(*) as count 
     FROM events 
     GROUP BY project_id 
     ORDER BY count DESC 
     LIMIT 10`
  );

  // Get recent events (last 24 hours) - MySQL syntax
  const recentResult = await query(
    `SELECT COUNT(*) as count 
     FROM events 
     WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  const recent24h = parseInt(recentResult.rows[0].count, 10);

  return {
    total,
    recent24h,
    byType: typeCounts.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count, 10)
    })),
    byProject: projectCounts.rows.map(row => ({
      projectId: row.project_id,
      count: parseInt(row.count, 10)
    }))
  };
}

