import express from 'express';
import bodyParser from 'body-parser';
import { yocoChargeHandler } from './yocoCharge.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(bodyParser.json());

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Yoco charge endpoint (keeps secret key on the server)
app.post('/api/yoco/charge', yocoChargeHandler);

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
