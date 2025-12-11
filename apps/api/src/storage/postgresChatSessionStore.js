import { query } from '../db/postgresql.js';

/**
 * PostgreSQL storage for Chat Sessions
 */
export async function createChatSession(data) {
  const result = await query(
    `INSERT INTO chat_sessions (microsite, project_id, lead_id, phone, bhk_type, conversation, metadata, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.microsite,
      data.projectId || null,
      data.leadId ? parseInt(data.leadId, 10) : null,
      data.phone || null,
      data.bhkType || null,
      JSON.stringify(data.conversation || []),
      JSON.stringify(data.metadata || {}),
      JSON.stringify(data.location || null)
    ]
  );
  
  const row = result.rows[0];
  return {
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  };
}

export async function getChatSessionById(id) {
  const result = await query(
    'SELECT * FROM chat_sessions WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  };
}

export async function getChatSessionsByLeadId(leadId) {
  const result = await query(
    'SELECT * FROM chat_sessions WHERE lead_id = $1 ORDER BY created_at DESC',
    [parseInt(leadId, 10)]
  );

  return result.rows.map(row => ({
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  }));
}

export async function getChatSessionsByMicrosite(microsite) {
  const result = await query(
    'SELECT * FROM chat_sessions WHERE microsite = $1 ORDER BY created_at DESC',
    [microsite]
  );

  return result.rows.map(row => ({
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  }));
}

export async function listChatSessions(filters = {}) {
  let whereConditions = [];
  let params = [];
  let paramCount = 1;

  if (filters.microsite) {
    whereConditions.push(`microsite = $${paramCount++}`);
    params.push(filters.microsite);
  }

  if (filters.leadId) {
    whereConditions.push(`lead_id = $${paramCount++}`);
    params.push(parseInt(filters.leadId, 10));
  }

  if (filters.projectId) {
    whereConditions.push(`project_id = $${paramCount++}`);
    params.push(filters.projectId);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM chat_sessions ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated results
  const skip = Number(filters.skip) || 0;
  const limit = Number(filters.limit) || 50;
  
  params.push(limit, skip);
  const itemsResult = await query(
    `SELECT * FROM chat_sessions ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount++}`,
    params
  );

  // Parse JSONB fields
  const items = itemsResult.rows.map(row => ({
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  }));

  return { items, total };
}

export async function updateChatSession(id, updates) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.conversation !== undefined) {
    fields.push(`conversation = $${paramCount++}`);
    values.push(JSON.stringify(updates.conversation));
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = $${paramCount++}`);
    values.push(JSON.stringify(updates.metadata));
  }
  if (updates.location !== undefined) {
    fields.push(`location = $${paramCount++}`);
    values.push(JSON.stringify(updates.location));
  }

  if (fields.length === 0) {
    return await getChatSessionById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
  };
}

export async function deleteChatSession(id) {
  await query('DELETE FROM chat_sessions WHERE id = $1', [id]);
  return true;
}
