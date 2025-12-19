// routes/task.js
import { Router } from "express";
import * as taskControllers from "../controllers/task.js";
import { auth } from "../middlewares/auth.js"; // Import the auth middleware

const router = Router();

// Apply auth middleware to ALL task routes
router.use(auth);

router.get(`/`, taskControllers.getAllTasks);
router.get(`/:id`, taskControllers.getTask);
router.post(`/`, taskControllers.addTask);
router.patch(`/:id`, taskControllers.editTask);
router.delete(`/:id`, taskControllers.deleteTask);

export default router;