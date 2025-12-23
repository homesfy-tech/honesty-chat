import { query } from '../db/mysql.js';

/**
 * MySQL storage for Widget Config
 */
export async function getWidgetConfig(projectId) {
  const result = await query(
    'SELECT * FROM widget_configs WHERE project_id = ?',
    [projectId]
  );
  
  if (result.rows.length === 0) {
    // Return default config if not found (so widget always has values)
    return {
      projectId: projectId,
      agentName: 'Riya from Homesfy',
      avatarUrl: 'https://cdn.homesfy.com/assets/riya-avatar.png',
      primaryColor: '#6158ff',
      followupMessage: 'Sure… I\'ll send that across right away!',
      bhkPrompt: 'Which configuration you are looking for?',
      inventoryMessage: 'That\'s cool… we have inventory available with us.',
      phonePrompt: 'Please enter your mobile number...',
      thankYouMessage: 'Thanks! Our expert will call you shortly 📞',
      bubblePosition: 'bottom-right',
      autoOpenDelayMs: 4000,
      welcomeMessage: 'Hi, I\'m Riya from Homesfy 👋\nHow can I help you today?',
      propertyInfo: {}
    };
  }

  const row = result.rows[0];
  // Convert database field names to camelCase for frontend
  return {
    projectId: row.project_id,
    agentName: row.agent_name,
    avatarUrl: row.avatar_url,
    primaryColor: row.primary_color,
    followupMessage: row.followup_message,
    bhkPrompt: row.bhk_prompt,
    inventoryMessage: row.inventory_message,
    phonePrompt: row.phone_prompt,
    thankYouMessage: row.thank_you_message,
    bubblePosition: row.bubble_position,
    autoOpenDelayMs: row.auto_open_delay_ms,
    welcomeMessage: row.welcome_message,
    propertyInfo: typeof row.property_info === 'string' ? JSON.parse(row.property_info) : (row.property_info || {}),
  };
}

// Helper function to convert database row to frontend format
function dbRowToConfig(row) {
  return {
    projectId: row.project_id,
    agentName: row.agent_name,
    avatarUrl: row.avatar_url,
    primaryColor: row.primary_color,
    followupMessage: row.followup_message,
    bhkPrompt: row.bhk_prompt,
    inventoryMessage: row.inventory_message,
    phonePrompt: row.phone_prompt,
    thankYouMessage: row.thank_you_message,
    bubblePosition: row.bubble_position,
    autoOpenDelayMs: row.auto_open_delay_ms,
    welcomeMessage: row.welcome_message,
    propertyInfo: typeof row.property_info === 'string' ? JSON.parse(row.property_info) : (row.property_info || {}),
  };
}

export async function createWidgetConfig(projectId, config) {
  await query(
    `INSERT INTO widget_configs (
      project_id, agent_name, avatar_url, primary_color, followup_message,
      bhk_prompt, inventory_message, phone_prompt, thank_you_message,
      bubble_position, auto_open_delay_ms, welcome_message, property_info,
      created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      config.agentName || 'Riya from Homesfy',
      config.avatarUrl || 'https://cdn.homesfy.com/assets/riya-avatar.png',
      config.primaryColor || '#6158ff',
      config.followupMessage || 'Sure… I\'ll send that across right away!',
      config.bhkPrompt || 'Which configuration you are looking for?',
      config.inventoryMessage || 'That\'s cool… we have inventory available with us.',
      config.phonePrompt || 'Please enter your mobile number...',
      config.thankYouMessage || 'Thanks! Our expert will call you shortly 📞',
      config.bubblePosition || 'bottom-right',
      config.autoOpenDelayMs || 4000,
      config.welcomeMessage || 'Hi, I\'m Riya from Homesfy 👋\nHow can I help you today?',
      JSON.stringify(config.propertyInfo || {}),
      config.createdBy || null,
      config.updatedBy || null
    ]
  );
  
  // Fetch inserted row
  const insertedRows = await query(
    'SELECT * FROM widget_configs WHERE project_id = ?',
    [projectId]
  );
  
  const row = insertedRows.rows[0];
  return dbRowToConfig(row);
}

export async function updateWidgetConfig(projectId, updates) {
  const fields = [];
  const values = [];

  const fieldMap = {
    agentName: 'agent_name',
    avatarUrl: 'avatar_url',
    primaryColor: 'primary_color',
    followupMessage: 'followup_message',
    bhkPrompt: 'bhk_prompt',
    inventoryMessage: 'inventory_message',
    phonePrompt: 'phone_prompt',
    thankYouMessage: 'thank_you_message',
    bubblePosition: 'bubble_position',
    autoOpenDelayMs: 'auto_open_delay_ms',
    welcomeMessage: 'welcome_message',
    propertyInfo: 'property_info',
    updatedBy: 'updated_by'
  };

  for (const [key, value] of Object.entries(updates)) {
    const dbField = fieldMap[key];
    if (dbField) {
      if (key === 'propertyInfo') {
        fields.push(`${dbField} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    }
  }

  if (fields.length === 0) {
    return await getWidgetConfig(projectId);
  }

  values.push(projectId);
  await query(
    `UPDATE widget_configs SET ${fields.join(', ')} WHERE project_id = ?`,
    values
  );

  // Fetch updated row
  const result = await query(
    'SELECT * FROM widget_configs WHERE project_id = ?',
    [projectId]
  );

  if (result.rows.length === 0) {
    // Config doesn't exist, create it with the updates (merge with defaults)
    const configWithDefaults = {
      agentName: 'Riya from Homesfy',
      avatarUrl: 'https://cdn.homesfy.com/assets/riya-avatar.png',
      primaryColor: '#6158ff',
      followupMessage: 'Sure… I\'ll send that across right away!',
      bhkPrompt: 'Which configuration you are looking for?',
      inventoryMessage: 'That\'s cool… we have inventory available with us.',
      phonePrompt: 'Please enter your mobile number...',
      thankYouMessage: 'Thanks! Our expert will call you shortly 📞',
      bubblePosition: 'bottom-right',
      autoOpenDelayMs: 4000,
      welcomeMessage: 'Hi, I\'m Riya from Homesfy 👋\nHow can I help you today?',
      propertyInfo: {},
      ...updates // Override with provided updates
    };
    return await createWidgetConfig(projectId, configWithDefaults);
  }

  const row = result.rows[0];
  return dbRowToConfig(row);
}

export async function deleteWidgetConfig(projectId) {
  await query('DELETE FROM widget_configs WHERE project_id = ?', [projectId]);
  return true;
}

export async function listWidgetConfigs() {
  const result = await query(
    'SELECT * FROM widget_configs ORDER BY created_at DESC',
    []
  );

  return result.rows.map(row => ({
    ...row,
    property_info: typeof row.property_info === 'string' ? JSON.parse(row.property_info) : row.property_info,
  }));
}

