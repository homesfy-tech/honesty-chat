import { query } from '../db/mysql.js';

/**
 * MySQL storage for Chat Sessions
 */
export async function createChatSession(data) {
  await query(
    `INSERT INTO chat_sessions (microsite, project_id, lead_id, phone, bhk_type, conversation, metadata, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
  
  // Fetch inserted row
  const insertedRows = await query(
    'SELECT * FROM chat_sessions WHERE id = LAST_INSERT_ID()',
    []
  );
  
  const row = insertedRows.rows[0];
  return {
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : (row.conversation || []),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    location: typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || null),
  };
}

export async function getChatSessionById(id) {
  const result = await query(
    'SELECT * FROM chat_sessions WHERE id = ?',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : (row.conversation || []),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    location: typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || null),
  };
}

export async function getChatSessionsByLeadId(leadId) {
  const result = await query(
    'SELECT * FROM chat_sessions WHERE lead_id = ? ORDER BY created_at DESC',
    [parseInt(leadId, 10)]
  );

  return result.rows.map(row => ({
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : (row.conversation || []),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    location: typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || null),
  }));
}

export async function getChatSessionsByMicrosite(microsite) {
  const result = await query(
    'SELECT * FROM chat_sessions WHERE microsite = ? ORDER BY created_at DESC',
    [microsite]
  );

  return result.rows.map(row => ({
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : (row.conversation || []),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    location: typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || null),
  }));
}

export async function listChatSessions(filters = {}) {
  let whereConditions = [];
  let params = [];

  if (filters.microsite) {
    whereConditions.push(`microsite = ?`);
    params.push(filters.microsite);
  }

  if (filters.leadId) {
    whereConditions.push(`lead_id = ?`);
    params.push(parseInt(filters.leadId, 10));
  }

  if (filters.projectId) {
    whereConditions.push(`project_id = ?`);
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
  // MySQL doesn't support placeholders for LIMIT/OFFSET - use safe integers
  const skip = Math.max(0, Math.floor(Number(filters.skip) || 0));
  const limit = Math.max(1, Math.min(1000, Math.floor(Number(filters.limit) || 50)));
  
  const itemsResult = await query(
    `SELECT * FROM chat_sessions ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${skip}`,
    params
  );

  // Parse JSON fields
  const items = itemsResult.rows.map(row => ({
    ...row,
    conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : (row.conversation || []),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    location: typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || null),
  }));

  return { items, total };
}

export async function updateChatSession(id, updates) {
  const fields = [];
  const values = [];

  if (updates.conversation !== undefined) {
    fields.push(`conversation = ?`);
    values.push(JSON.stringify(updates.conversation));
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = ?`);
    values.push(JSON.stringify(updates.metadata));
  }
  if (updates.location !== undefined) {
    fields.push(`location = ?`);
    values.push(JSON.stringify(updates.location));
  }

  if (fields.length === 0) {
    return await getChatSessionById(id);
  }

  values.push(id);
  await query(
    `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  // Fetch updated row
  return await getChatSessionById(id);
}

export async function deleteChatSession(id) {
  await query('DELETE FROM chat_sessions WHERE id = ?', [id]);
  return true;
}

