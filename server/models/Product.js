const mongoose = require('mongoose');
const slugify = require('slugify');

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter product name'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Please enter product description'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please enter product price'],
      default: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please select a category'],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
      },
    ],

    // Variants for products with different sizes/colors
    variants: [
      {
        size: {
          type: String,
          trim: true
        },
        color: {
          type: String,
          trim: true
        },
        stock: {
          type: Number,
          required: [true, 'Please enter variant stock'],
          default: 0
        },
        price: {
          type: Number,
          required: [true, 'Please enter variant price'],
          default: 0
        }
      }
    ],
    stock: {
      type: Number,
      required: [true, 'Please enter product stock'],
      default: 0,
    },
    ratings: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [ReviewSchema],
  },
  { timestamps: true }
);

ProductSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  if (this.isModified('reviews')) {
    this.calculateRatings();
  }
  next()
})

  
// ── Ratings calculate logic 
 ProductSchema.methods.calculateRatings = function () {
  if (this.reviews.length === 0) {
    this.ratings = 0;
    this.numReviews = 0;
    return;
  }

 
  const total = this.reviews.reduce((acc, review) => {
    return acc + review.rating;
  }, 0);

  this.ratings = Number((total / this.reviews.length).toFixed(1));
  this.numReviews = this.reviews.length;
};

module.exports = mongoose.model('Product', ProductSchema);