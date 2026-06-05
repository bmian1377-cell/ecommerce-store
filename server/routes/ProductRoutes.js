const express = require('express');
const router  = express.Router();
const {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  addReview,
  deleteReview,
  getproductBySlug,
} = require('../controller/productController');
const { protect, adminOnly } = require('../middleware/AuthMiddleware');

// Public Routes 
router.get('/',    getAllProducts);//ok
router.get('/:slug', getproductBySlug);//ok


// ── Admin Only ────────────────────────────────
router.post  ('/',    protect, adminOnly, createProduct); //ok
router.put   ('/:id', protect, adminOnly, updateProduct);//ok
router.delete('/:id', protect, adminOnly, deleteProduct);//ok
router.get('/:id', protect, adminOnly, getSingleProduct);//ok

//  Protected must be logged in to review
router.post  ('/:id/reviews', protect, addReview);
router.delete('/:id/reviews', protect, deleteReview);

module.exports = router;