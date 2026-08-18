require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const path = require('path');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const placeRoutes = require('./routes/placeRoutes');
const cleaningLogRoutes = require('./routes/cleaningLogRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// ─── Connect to Database ──────────────────────────────────────────────────────
connectDB();

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────
const clientUrl = process.env.CLIENT_URL;
if (clientUrl) {
  const allowedOrigins = clientUrl.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS'));
        }
      },
      credentials: true,
    })
  );
} else {
  app.use(cors());
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', message: 'N-CLEAN API is running 🧹' })
);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/cleaning-logs', cleaningLogRoutes);

// ─── Static Assets in Production (All-in-One Deployment) ───────────────────────
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    // If request starts with /api, pass to 404 handler
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
