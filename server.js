require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const http = require('http');
const { Server } = require('socket.io');

const Task = require('./models/Task');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app); // ✅ NEW

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Safety check
if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

/* ------------------ SOCKET CONNECTION ------------------ */
io.on("connection", (socket) => {
  console.log("⚡ User connected");

  socket.on("disconnect", () => {
    console.log("❌ User disconnected");
  });
});

/* ------------------ AUTH ROUTES ------------------ */
app.use('/auth', authRoutes);

/* ------------------ TASK ROUTES ------------------ */

// ✅ Create Task
app.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description, completed, dueDate } = req.body;

    const newTask = new Task({
      title,
      description,
      completed,
      dueDate,
      userId: req.userId
    });

    await newTask.save();

    // 🔥 REAL-TIME EVENT
    io.emit("taskUpdated");

    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Read All Tasks
app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Read Single Task
app.get('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update Task
app.put('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, completed, dueDate } = req.body;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, description, completed, dueDate },
      { new: true }
    );

    if (!updatedTask) return res.status(404).json({ message: "Task not found" });

    // 🔥 REAL-TIME EVENT
    io.emit("taskUpdated");

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete Task
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!deletedTask) return res.status(404).json({ message: "Task not found" });

    // 🔥 REAL-TIME EVENT
    io.emit("taskUpdated");

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ SERVE FRONTEND ------------------ */
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ------------------ SERVER START ------------------ */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});