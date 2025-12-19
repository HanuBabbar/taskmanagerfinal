// controllers/task.js
import task from "../DB/models/task.js"
import { createCustomError } from "../errors/custom-error.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import { getIO, getAdapterPubClient } from "../socket.js";
import redisClient from "../DB/redis.js";

function getRedisClientFallback() {
    if (redisClient && redisClient.isOpen) return redisClient;
    try {
        const pub = getAdapterPubClient && getAdapterPubClient();
        if (pub && pub.isOpen) return pub;
    } catch (err) {
        // ignore
    }
    return null;
}

export const getAllTasks = asyncWrapper(
    async (req, res) => {
        // Only get tasks for the logged-in user
        const cacheKey = `cache:tasks:user:${req.user.id}`;
        try {
            const client = getRedisClientFallback();
            if (client && client.isOpen) {
                const cached = await client.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    return res.status(200).json({ tasks: parsed });
                }
            }
        } catch (err) {
            console.warn('Redis get error', err);
        }

        const tasks = await task.find({ user: req.user.id });

        try {
            const client = getRedisClientFallback();
            if (client && client.isOpen) {
                // convert to plain objects to avoid mongoose-specific fields
                const toCache = tasks.map((t) => t.toObject ? t.toObject() : t);
                await client.set(cacheKey, JSON.stringify(toCache), { EX: 60 });
            }
        } catch (err) {
            console.warn('Redis set error', err);
        }

        res.status(200).json({ tasks });
    }
);

export const getTask = asyncWrapper(
    async (req, res, next) => {
        const { id } = req.params;
        // Only find task if it belongs to the logged-in user
        const singleTask = await task.findOne({ _id: id, user: req.user.id });

        if (singleTask) {
            return res.status(200).json({ singleTask });
        }

        const error = createCustomError('Task Not Found', 404);
        next(error);
    }
);

export const editTask = asyncWrapper(
    async (req, res, next) => {
        const { id } = req.params;

        // Find task and verify it belongs to the user
        const targetTask = await task.findOne({ _id: id, user: req.user.id });

        // check if the task not found
        if (!targetTask) {
            const error = createCustomError('Task Not Found', 404);
            return next(error);
        }

        // update the chosen one
        const updatedTask = await task.findOneAndUpdate(
            { _id: id, user: req.user.id },
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        try {
            const io = getIO();
            io.to(`user:${req.user.id}`).emit('task:updated', updatedTask);
        } catch (err) {
            // socket not initialized or emit failed, ignore
        }

        // invalidate cache for this user
        try {
            const client = getRedisClientFallback();
            if (client && client.isOpen) {
                const cacheKey = `cache:tasks:user:${req.user.id}`;
                await client.del(cacheKey);
            }
        } catch (err) {
            console.warn('Redis del error', err);
        }

        return res.status(200).json({ message: `task updated successfully!`, updatedTask });
    }
);

export const addTask = asyncWrapper(
    async (req, res, next) => {
        const { name } = req.body;

        // Check if this task name already exists FOR THIS USER
        const foundTask = await task.findOne({ name, user: req.user.id });

        // check if this task is already existed
        if (foundTask) {
            const error = createCustomError(`this task name already existed!`, 409);
            return next(error);
        }

        // Create task with user reference
        const newTask = await task.create({
            ...req.body,
            user: req.user.id
        });

        try {
            const io = getIO();
            io.to(`user:${req.user.id}`).emit('task:added', newTask);
        } catch (err) {
            // ignore if socket not ready
        }

        // invalidate cache for this user
        try {
            const client = getRedisClientFallback();
            if (client && client.isOpen) {
                const cacheKey = `cache:tasks:user:${req.user.id}`;
                await client.del(cacheKey);
            }
        } catch (err) {
            console.warn('Redis del error', err);
        }

        return res.status(201).json({
            message: 'added new task successfully!',
            newTask
        });
    }
);

export const deleteTask = asyncWrapper(
    async (req, res, next) => {
        const { id } = req.params;

        // Find task and verify it belongs to the user
        const singleTask = await task.findOne({ _id: id, user: req.user.id });

        // check if the task found to delete
        if (!singleTask) {
            const error = createCustomError('Task Not Found to delete!', 404);
            return next(error);
        }

        // delete the chosen one
        await task.findOneAndDelete({ _id: id, user: req.user.id });

        try {
            const io = getIO();
            io.to(`user:${req.user.id}`).emit('task:deleted', { id });
        } catch (err) {
            // ignore
        }

        // invalidate cache for this user
        try {
            const client = getRedisClientFallback();
            if (client && client.isOpen) {
                const cacheKey = `cache:tasks:user:${req.user.id}`;
                await client.del(cacheKey);
            }
        } catch (err) {
            console.warn('Redis del error', err);
        }

        return res.status(200).json({ message: 'Task Deleted Successfully!' });
    }
);