const Order   = require('../models/Order');
const Cart    = require('../models/Cart');
const Product = require('../models/Product');

// ── Create Order ──────────────────────────────
async function createOrder(req, res) {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    // 1. Cart lo
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // 2. Stock check karo — har item ka
    // DSA: Array forEach — O(n)
    for (let item of cart.items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.name}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.name}. Available: ${product.stock}`
        });
      }
    }

    // 3. Order items banao — Cart se copy karo
    const orderItems = cart.items.map(item => ({
      product:  item.product,
      name:     item.name,
      image:    item.image,
      color:    item.color,
      size:     item.size,
      quantity: item.quantity,
      price:    item.currentProductPrice,
    }));

    // 4. Order banao
    const order = new Order({
      user:            req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod:   paymentMethod || 'COD',
    });

    // 5. Total calculate — pre save hook chalega
    order.calculateTotalPrice();
    await order.save();

    // 6. Stock update karo — har product ka
    for (let item of cart.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
        //     ↑ stock kam karo
      });
    }

    // 7. Cart clear karo
    cart.items = [];
    await cart.save();

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ── Get My Orders ─────────────────────────────
async function getMyOrders(req, res) {
  try {
    // DSA: Pagination
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const total  = await Order.countDocuments({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
      .sort('-createdAt')  // latest pehle
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ── Get Single Order ──────────────────────────
async function getSingleOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Apna order hai? Admin nahi hai?
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ── Get All Orders — Admin Only ───────────────
async function getAllOrders(req, res) {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    // Filter by status:
    // GET /api/orders/all?status=processing
    const queryObj = {};
    if (req.query.status) {
      queryObj.orderStatus = req.query.status;
    }

    const total  = await Order.countDocuments(queryObj);
    const orders = await Order.find(queryObj)
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    // DSA: Array reduce — total revenue calculate
    const totalRevenue = orders.reduce((acc, order) => {
      return acc + order.totalPrice;
    }, 0);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      totalRevenue,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ── Update Order Status — Admin Only ──────────
async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Delivered order cancel nahi ho sakti
    if (order.orderStatus === 'delivered' && status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Delivered order cannot be cancelled'
      });
    }

    // Cancel hone pe stock wapas karo
    if (status === 'cancelled' && order.orderStatus !== 'cancelled') {
      for (let item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: +item.quantity }
          //     ↑ stock wapas add karo
        });
      }
    }

    // updateStatus method use karo — Order model ka
    order.updateStatus(status);
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order status updated',
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ── Cancel Order — Customer ───────────────────
async function cancelOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Apna order hai?
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Sirf processing order cancel ho sakti hai
    if (order.orderStatus !== 'processing') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel — order is ${order.orderStatus}`
      });
    }

    // Stock wapas karo
    for (let item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: +item.quantity }
      });
    }

    order.updateStatus('cancelled');
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getSingleOrder,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};