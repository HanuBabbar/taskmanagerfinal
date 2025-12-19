// routes/auth.js
import { Router } from "express";
import * as authControllers from "../controllers/auth.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

router.post('/register', authControllers.register);
router.post('/login', authControllers.login);

// return current authenticated user
router.get('/me', auth, authControllers.me);

export default router;