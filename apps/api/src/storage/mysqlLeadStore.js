import { query } from '../db/mysql.js';

/**
 * MySQL storage for Leads
 */
export async function createLead(data) {
  await query(
    `INSERT INTO leads (phone, bhk_type, bhk, microsite, lead_source, status, metadata, conversation, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.phone || null,
      data.bhkType,
      data.bhk || null,
      data.microsite,
      data.leadSource || 'ChatWidget',
      data.status || 'new',
      JSON.stringify(data.metadata || {}),
      JSON.stringify(data.conversation || []),
      JSON.stringify(data.location || null)
    ]
  );
  
  // MySQL doesn't support RETURNING, so get the last insert ID
  const result = await query('SELECT * FROM leads WHERE id = LAST_INSERT_ID()', []);
  return result.rows[0];
}

export async function listLeads(filters = {}) {
  let whereConditions = [];
  let params = [];

  if (filters.microsite) {
    whereConditions.push(`microsite = ?`);
    params.push(filters.microsite);
  }

  if (filters.search) {
    whereConditions.push(`(
      LOWER(microsite) LIKE LOWER(?) OR
      phone LIKE ? OR
      CAST(metadata AS CHAR) LIKE ?
    )`);
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
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

  if (filters.status) {
    whereConditions.push(`status = ?`);
    params.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM leads ${whereClause}`,
    params.length > 0 ? params : []
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated results
  const skip = filters.skip !== undefined && filters.skip !== null 
    ? parseInt(filters.skip, 10) 
    : 0;
  const limit = filters.limit !== undefined && filters.limit !== null 
    ? parseInt(filters.limit, 10) 
    : 50;
  
  // Ensure skip and limit are valid integers
  const validSkip = isNaN(skip) ? 0 : Math.max(0, skip);
  const validLimit = isNaN(limit) ? 50 : Math.max(1, Math.min(1000, limit)); // Cap at 1000
  
  // MySQL uses LIMIT offset, count
  const limitParams = params.length > 0 ? [...params, validSkip, validLimit] : [validSkip, validLimit];
  const itemsResult = await query(
    `SELECT * FROM leads ${whereClause}
     ORDER BY created_at DESC
     LIMIT ?, ?`,
    limitParams
  );

  // Parse JSON fields
  const items = itemsResult.rows.map(row => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  }));

  return { items, total };
}

export async function getLeadById(id) {
  const result = await query(
    'SELECT * FROM leads WHERE id = ?',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  };
}

export async function updateLead(id, updates) {
  const fields = [];
  const values = [];

  if (updates.phone !== undefined) {
    fields.push(`phone = ?`);
    values.push(updates.phone);
  }
  if (updates.bhkType !== undefined) {
    fields.push(`bhk_type = ?`);
    values.push(updates.bhkType);
  }
  if (updates.bhk !== undefined) {
    fields.push(`bhk = ?`);
    values.push(updates.bhk);
  }
  if (updates.status !== undefined) {
    fields.push(`status = ?`);
    values.push(updates.status);
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = ?`);
    values.push(JSON.stringify(updates.metadata));
  }
  if (updates.conversation !== undefined) {
    fields.push(`conversation = ?`);
    values.push(JSON.stringify(updates.conversation));
  }
  if (updates.location !== undefined) {
    fields.push(`location = ?`);
    values.push(JSON.stringify(updates.location));
  }

  if (fields.length === 0) {
    return await getLeadById(id);
  }

  values.push(id);
  await query(
    `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  // MySQL doesn't support RETURNING, so fetch the updated row
  const result = await query('SELECT * FROM leads WHERE id = ?', [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  };
}

export async function deleteLead(id) {
  await query('DELETE FROM leads WHERE id = ?', [id]);
  return true;
}

