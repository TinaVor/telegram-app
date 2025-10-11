const express = require('express');
const path = require('path');

// Initialize database
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
  next();
});
app.use(express.json());

// Routes
app.use('/api', require('./routes/api'));

// Обслуживание React-аппа в продакшене
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
