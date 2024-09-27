const mongoose = require('mongoose');

// Define the schema for a trade
const tradeSchema = new mongoose.Schema({
  utcTime: { type: Date, required: true },
  operation: { type: String, enum: ['buy', 'sell'], required: true },
  baseCoin: { type: String, required: true },
  quoteCoin: { type: String, required: true },
  buySellAmount: { type: Number, required: true },
  price: { type: Number, required: true }
});

// Create and export the Trade model
const Trade = mongoose.model('Trade', tradeSchema);
module.exports = Trade;
