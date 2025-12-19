// controllers/auth.js
import User from "../DB/models/user.js";
import { createCustomError } from "../errors/custom-error.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import jwt from "jsonwebtoken";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const register = asyncWrapper(
  async (req, res, next) => {
    const { username, email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      const error = createCustomError('Server misconfiguration: JWT secret is not set', 500);
      return next(error);
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      const error = createCustomError('User already exists', 409);
      return next(error);
    }

    // Create user
    user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  }
);

export const login = asyncWrapper(
  async (req, res, next) => {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      const error = createCustomError('Invalid credentials', 401);
      return next(error);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = createCustomError('Invalid credentials', 401);
      return next(error);
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  }
);

export const me = asyncWrapper(
  async (req, res) => {
    // `auth` middleware attaches the user to req.user (without password)
    return res.json({ user: req.user });
  }
);