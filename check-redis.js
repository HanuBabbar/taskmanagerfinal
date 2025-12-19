
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    try {
        await client.connect();

        console.log('Connected to Redis at', process.env.REDIS_URL);

        const keys = await client.keys('*');
        console.log('\nKeys found:', keys.length);

        if (keys.length > 0) {
            console.log('--------------------------------------------------');
            for (const key of keys) {
                const type = await client.type(key);
                let value = '<cannot retrieve>';

                if (type === 'string') {
                    value = await client.get(key);
                } else if (type === 'hash') {
                    value = JSON.stringify(await client.hGetAll(key));
                } else if (type === 'list') {
                    value = JSON.stringify(await client.lRange(key, 0, -1));
                } else if (type === 'set') {
                    value = JSON.stringify(await client.sMembers(key));
                }

                console.log(`Key: ${key}`);
                console.log(`Type: ${type}`);
                console.log(`Value: ${value}`);
                console.log('--------------------------------------------------');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.disconnect();
    }
})();
