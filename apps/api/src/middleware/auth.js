export function requireApiKey(req, res, next) {
  const apiKey = (req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || '').trim();
  const expectedKey = (process.env.WIDGET_CONFIG_API_KEY || '').trim();

  if (!expectedKey || expectedKey === '') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  WIDGET_CONFIG_API_KEY not set');
    }
    return next();
  }

  if (!apiKey || apiKey === '') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide X-API-Key header or Authorization: Bearer <key>',
    });
  }

  if (apiKey !== expectedKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
    });
  }

  next();
}

