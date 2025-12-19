import { createClient } from 'redis';

let redisClient = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryConnect(client, attempts = 5, delay = 2000) {
  for (let i = 0; i < attempts; i++) {
    try {
      await client.connect();
      console.log('Connected to Redis');
      return true;
    } catch (err) {
      console.error(`Redis connect attempt ${i + 1} failed:`, err && err.message ? err.message : err);
      if (err && err.stack) console.error(err.stack);
      // last attempt will not wait
      if (i < attempts - 1) await wait(delay);
    }
  }
  console.error('Could not connect to Redis after retries');
  return false;
}

if (process.env.REDIS_URL) {
  try {
    // create client immediately so callers can check existence; connect in background with retries
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    // attempt to connect with retries but don't block the rest of the app
    (async () => {
      try {
        const ok = await tryConnect(redisClient, 8, 2000);
        if (!ok) {
          // fallback: try to reuse adapter's pubClient if available
          try {
            const { getAdapterPubClient } = await import('../socket.js');
            const pub = getAdapterPubClient && getAdapterPubClient();
            if (pub && pub.isOpen) {
              redisClient = pub;
              console.log('Reusing Socket.IO adapter Redis client for caching');
            } else if (pub) {
              console.warn('Adapter pubClient exists but is not open');
            }
          } catch (err) {
            console.error('Error trying to reuse adapter client for Redis caching:', err && err.stack ? err.stack : err);
          }
        }
      } catch (err) {
        console.error('Unexpected error while connecting to Redis', err && err.stack ? err.stack : err);
      }
    })();
  } catch (err) {
    console.error('Failed to create Redis client', err);
    redisClient = null;
  }
} else {
  // No REDIS_URL configured; redisClient stays null
}

export default redisClient;
