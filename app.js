import Express from 'express'
import taskRouter from './routes/task.js';
import authRouter from './routes/auth.js'; // Import auth routes
import connectDB from './DB/connection.js';
import cors from 'cors';
import notFoundHandler from './middlewares/not-found.js';
import errorHandler from './middlewares/errorHandler.js';
import dotenv from 'dotenv'
import { createServer } from 'http';
import { initIO } from './socket.js';

dotenv.config();

const app = Express();

// middlewares
app.use(cors()); // to choose which servers or hosts can use this app
app.use(Express.static('./public'));
app.use(Express.json());

connectDB();

// routes
const baseRoute = `/api/v1`;
app.use(`${baseRoute}/auth`, authRouter); // Add auth routes
app.use(`${baseRoute}/tasks`, taskRouter); // This now requires authentication

app.use(notFoundHandler)
app.use(errorHandler)

const port = parseInt(process.env.SERVER_PORT);

// create http server and attach socket.io
const httpServer = createServer(app);
initIO(httpServer);

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    httpServer.listen(port, () => console.log(`server running on port ${port}!`));
}

export default app;