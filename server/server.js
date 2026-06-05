const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const ConnectDB = require('./config/db')

dotenv.config();
ConnectDB();

const app = express()

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/AuthRotes');
app.use('/api/auth', authRoutes);

const CategoryRoutes = require('./routes/CategoryRoutes');
app.use('/api/category', CategoryRoutes);

const ProductRoutes = require('./routes/ProductRoutes');
app.use('/api/products', ProductRoutes);

const CartRoutes = require('./routes/CartRoutes');
app.use('/api/cart', CartRoutes);

const OrderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', OrderRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});