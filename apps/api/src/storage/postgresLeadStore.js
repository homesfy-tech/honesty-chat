import { query } from '../db/postgresql.js';

/**
 * PostgreSQL storage for Leads
 */
export async function createLead(data) {
  const result = await query(
    `INSERT INTO leads (phone, bhk_type, bhk, microsite, lead_source, status, metadata, conversation, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
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
  
  return result.rows[0];
}

export async function listLeads(filters = {}) {
  let whereConditions = [];
  let params = [];
  let paramCount = 1;

  if (filters.microsite) {
    whereConditions.push(`microsite = $${paramCount++}`);
    params.push(filters.microsite);
  }

  if (filters.search) {
    whereConditions.push(`(
      microsite ILIKE $${paramCount} OR
      phone ILIKE $${paramCount} OR
      metadata::text ILIKE $${paramCount}
    )`);
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  if (filters.startDate || filters.endDate) {
    if (filters.startDate && filters.endDate) {
      whereConditions.push(`created_at BETWEEN $${paramCount} AND $${paramCount + 1}`);
      params.push(new Date(filters.startDate), new Date(filters.endDate));
      paramCount += 2;
    } else if (filters.startDate) {
      whereConditions.push(`created_at >= $${paramCount++}`);
      params.push(new Date(filters.startDate));
    } else if (filters.endDate) {
      whereConditions.push(`created_at <= $${paramCount++}`);
      params.push(new Date(filters.endDate));
    }
  }

  if (filters.status) {
    whereConditions.push(`status = $${paramCount++}`);
    params.push(filters.status);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM leads ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated results
  const skip = Number(filters.skip) || 0;
  const limit = Number(filters.limit) || 50;
  
  params.push(limit, skip);
  const itemsResult = await query(
    `SELECT * FROM leads ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount++}`,
    params
  );

  // Parse JSONB fields
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
    'SELECT * FROM leads WHERE id = $1',
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
  let paramCount = 1;

  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramCount++}`);
    values.push(updates.phone);
  }
  if (updates.bhkType !== undefined) {
    fields.push(`bhk_type = $${paramCount++}`);
    values.push(updates.bhkType);
  }
  if (updates.bhk !== undefined) {
    fields.push(`bhk = $${paramCount++}`);
    values.push(updates.bhk);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(updates.status);
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = $${paramCount++}`);
    values.push(JSON.stringify(updates.metadata));
  }
  if (updates.conversation !== undefined) {
    fields.push(`conversation = $${paramCount++}`);
    values.push(JSON.stringify(updates.conversation));
  }
  if (updates.location !== undefined) {
    fields.push(`location = $${paramCount++}`);
    values.push(JSON.stringify(updates.location));
  }

  if (fields.length === 0) {
    return await getLeadById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE leads SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
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

export async function deleteLead(id) {
  await query('DELETE FROM leads WHERE id = $1', [id]);
  return true;
}

