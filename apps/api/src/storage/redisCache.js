/**
 * Redis Cache for Widget Configs
 * Optional: Improves performance for 1000+ microsites
 * Falls back to no caching if Redis is not available
 */

let redisClient = null;
let redisAvailable = false;

/**
 * Initialize Redis connection (optional)
 */
export async function initRedis() {
  // Only initialize if REDIS_URL is set
  if (!process.env.REDIS_URL) {
    return false;
  }

  try {
    const redis = await import('redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => {
      console.warn('Redis Client Error:', err);
      redisAvailable = false;
    });

    await redisClient.connect();
    redisAvailable = true;
    console.log('✅ Redis connected for caching');
    return true;
  } catch (error) {
    console.warn('⚠️  Redis not available, caching disabled:', error.message);
    redisAvailable = false;
    return false;
  }
}

/**
 * Get widget config from cache
 */
export async function getCachedConfig(projectId) {
  if (!redisAvailable || !redisClient) {
    return null;
  }

  try {
    const cached = await redisClient.get(`widget:config:${projectId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.warn('Redis get error:', error);
    return null;
  }
}

/**
 * Set widget config in cache
 */
export async function setCachedConfig(projectId, config, ttl = 300) {
  // TTL: 5 minutes default (300 seconds)
  if (!redisAvailable || !redisClient) {
    return false;
  }

  try {
    await redisClient.setEx(
      `widget:config:${projectId}`,
      ttl,
      JSON.stringify(config)
    );
    return true;
  } catch (error) {
    console.warn('Redis set error:', error);
    return false;
  }
}

/**
 * Invalidate widget config cache
 */
export async function invalidateConfigCache(projectId) {
  if (!redisAvailable || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(`widget:config:${projectId}`);
    return true;
  } catch (error) {
    console.warn('Redis delete error:', error);
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisAvailable = false;
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.warn('Error closing Redis:', error);
    }
  }
}

