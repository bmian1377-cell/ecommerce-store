const mongoose = require('mongoose'); 
const Product = require('../models/Product');
const Category = require('../models/Category');


async function createProduct(req, res) {
  try {
    const {
      name, description, price,
      discountPrice, category, images,
      stock, variants
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Category ID format'
      });
    }

    
    const categoryExist = await Category.findById(category);
    if (!categoryExist) {
         
   
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    
    const product = await Product.create({
      name, description, price: Number(price),
      discountPrice: discountPrice !== undefined ? Number(discountPrice) : undefined, 
      category, images, stock: Number(stock), variants
    });
   
    return res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
  
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

// ── Get All Products — Filters + Pagination ───
async function getAllProducts(req, res) {
  try {
    // ── Filters ───────────────────────────────
    const queryObj = {};

    // Category filter:
    if (req.query.category) {
      queryObj.category = req.query.category;
    }

    // Price filter :
    if (req.query.minprice || req.query.maxprice) {
      queryObj.price = {};
      if (req.query.minprice) queryObj.price.$gte = Number(req.query.minprice);
      if (req.query.maxprice) queryObj.price.$lte = Number(req.query.maxprice);
    }

    // Stock filter:
    if (req.query.instock === 'true') {
      queryObj.stock = { $gt: 0 };
    }

    // Search — name se:
    if (req.query.search) {
      queryObj.name = {
        $regex:   req.query.search,
        $options: 'i', // case insensitive
      };
    }

    // ── Sorting 
    let sortBy = { createdAt: -1 }; // default — latest pehle
    if (req.query.sortby) {
      const sortField = req.query.sortby;
      const sortOrder = req.query.sortorder === 'asc' ? 1 : -1;
      sortBy = { [sortField]: sortOrder };
    }

    // ── Pagination ────────────────────────────
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    // ── Query Execute ─────────────────────────
    const total    = await Product.countDocuments(queryObj);
    const products = await Product.find(queryObj)
      .populate('category', 'name slug')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

// ── Get Single Product ────────────────────────
async function getSingleProduct(req, res) {
  try {
    const { id } = req.params;

    // CastError Protection
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Product ID format' });
    }

    const product = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('reviews.user', 'name avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

async function getproductBySlug(req, res) {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug })
      .populate('category', 'name slug')
      .populate('reviews.user', 'name avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

// ── Update Product — Admin Only ───────────────
async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Product ID format' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const {
      name, description, price,
      discountPrice, category,
      images, stock, variants
    } = req.body;

    // ⚡ Fixed: Safe Category Update & Existence Check
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: 'Invalid Target Category ID format' });
      }
      const categoryExist = await Category.findById(category);
      if (!categoryExist) {
        return res.status(404).json({ success: false, message: 'Target Category not found' });
      }
      product.category = category;
    }

    if (name)        product.name        = name;
    if (description) product.description = description;
    if (price)       product.price       = Number(price);
    
    // better to check for undefined specifically, taake falsy values (like 0) update ho sakein
    if (discountPrice !== undefined) product.discountPrice = Number(discountPrice);
    if (images)      product.images      = images;
    if (stock !== undefined)         product.stock         = Number(stock);
    if (variants)    product.variants    = variants;

    await product.save(); 

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

// ── Delete Product — Admin Only ───────────────
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Product ID format' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

// ── Add Review ────────────────────────────────
async function addReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Product ID format' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // check if user already reviewed this product
    const alreadyReviewed = product.reviews.find(
      review => review.user?.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      product.reviews.forEach(review => {  // ⚡ Fixed: Safe string check for update
        if (review.user?.toString() === req.user._id.toString()) {
          review.rating  = Number(rating);
          review.comment = comment;
        }
      });
    } else {
      product.reviews.push({
        user:    req.user._id,
        name:    req.user.name,
        rating:  Number(rating),
        comment,
      });
    }

  
    await product.save();

    return res.status(200).json({
      success: true,
      message: alreadyReviewed
        ? 'Review updated successfully'
        : 'Review added successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

// ── Delete Review ─────────────────────────────
async function deleteReview(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Product ID format' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // ⚡ Fixed: Safe string check for filter
    product.reviews = product.reviews.filter(
      review => review.user?.toString() !== req.user._id.toString()
    );

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  addReview,
  deleteReview,
  getproductBySlug
};