const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const Trade = require('./models/Trade');
const dotenv = require('dotenv');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware to parse JSON request body
app.use(express.json());

dotenv.config({
  path: '.env',
});

// MongoDB connection 
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); 
  });

/**
 * Task 1: CSV File Upload and Store Trades in MongoDB
 */
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      try {
        const [baseCoin, quoteCoin] = data.Market.split('/');
        const trade = new Trade({
          utcTime: new Date(data.UTC_Time),
          operation: data.Operation.toLowerCase(),
          baseCoin,
          quoteCoin,
          buySellAmount: parseFloat(data['Buy/Sell Amount']),
          price: parseFloat(data.Price)
        });
        results.push(trade);
      } catch (err) {
        console.error('Error processing CSV row:', err);
      }
    })
    .on('end', async () => {
      try {
        await Trade.insertMany(results);
        res.json({ message: 'Trades successfully saved to the database!' });
      } catch (err) {
        console.error('Error saving to MongoDB:', err);
        res.status(500).json({ error: 'Error saving trades to the database' });
      }
    })
    .on('error', (err) => {
      console.error('Error reading the file:', err);
      res.status(500).json({ error: 'Error processing the file' });
    });
});

/**
 * Task 2: Get Asset Balance at a Given Timestamp
 */
app.post('/balance', async (req, res) => {
  try {
    const { timestamp } = req.body;

    if (!timestamp) {
      return res.status(400).json({ error: 'Timestamp is required' });
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }

    const trades = await Trade.find({ utcTime: { $lte: date } });
    const balance = {};

    trades.forEach(trade => {
      if (!balance[trade.baseCoin]) {
        balance[trade.baseCoin] = 0;
      }

      if (trade.operation === 'buy') {
        balance[trade.baseCoin] += trade.buySellAmount;
      } else {
        balance[trade.baseCoin] -= trade.buySellAmount;
      }
    });

    res.json({ balance });
  } catch (err) {
    console.error('Error retrieving balance:', err);
    res.status(500).json({ error: 'Error retrieving balance' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
