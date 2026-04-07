require('dotenv').config();

const express         = require('express');
const mongoose        = require('mongoose');
const path            = require('path');
const cookieParser    = require('cookie-parser');
const morgan          = require('morgan');
const cors            = require('cors');


const authRoutes  = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const apiRoutes   = require('./routes/apiRoutes');
const pageRoutes  = require('./routes/pageRoutes');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./config/logger');

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(cors());

// ─── Database ─────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch((err) => {
    console.log('MONGODB FULL ERROR:', err);
    process.exit(1);
  });

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/',        pageRoutes);
app.use('/auth',    authRoutes);
app.use('/events',  eventRoutes);
app.use('/api',     apiRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;