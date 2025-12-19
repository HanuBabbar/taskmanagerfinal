// middlewares/auth.js
import jwt from "jsonwebtoken";
import User from "../DB/models/user.js";
import { createCustomError } from "../errors/custom-error.js";
import asyncWrapper from "./asyncWrapper.js";

export const auth = asyncWrapper(
  async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const error = createCustomError('No token, authorization denied', 401);
      return next(error);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        const error = createCustomError('Token is not valid', 401);
        return next(error);
      }

      req.user = user;
      next();
    } catch (error) {
      const authError = createCustomError('Token is not valid', 401);
      next(authError);
    }
  }
);