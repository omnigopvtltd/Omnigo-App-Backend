// const mongoose = require("mongoose");

// const cartSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//   },

//   items: [
//     {
//       orderFrom: {
//         type: String,
//         // enum: ["fast-food", "grocery", "pharmacy", "bakery", "other"],
//         default: "fast-food",
//       },
//       productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//       },

//       name: String,
//       image: String,
//       category: String,
//       weight: String,

//       price: Number,
//       quantity: Number,

//       variations: [
//         {
//           title: { type: String }, // e.g. "Size", "Flavour"
//           options: [
//             {
//               name: { type: String }, // e.g. "Large", "Chocolate"
//               price: { type: Number, default: 0 },
//             },
//           ],
//         },
//       ],
//       addOns: [
//         {
//           name: String,
//           price: { type: Number, default: 0 },
//         },
//       ],

//       serving: { type: String, default: "full" },
//       isVeg: { type: Boolean, default: false },

//       total: Number,
//     },
//   ],
// });

// module.exports = mongoose.model("Cart", cartSchema);


const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        orderFrom: {
          type: String,
          default: "fast-food",
        },
        itemType: {
          type: String,
          enum: ["product", "deal", "campaign"],
          default: "product",
        },
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "items.itemTypeRef",
        },
        itemTypeRef: {
          type: String,
          enum: ["Product", "Deal", "Campaign"],
          default: "Product",
        },
        vendorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vendor",
        },
        name: String,
        image: String,
        category: String,
        weight: String,
        price: Number, // Base/Discounted Unit Price
        originalPrice: Number,
        quantity: Number,
        variations: [
          {
            title: String,
            options: [
              {
                name: String,
                price: { type: Number, default: 0 },
              },
            ],
            price: { type: Number, default: 0 }, // Individual variation selected price
          },
        ],
        addOns: [
          {
            name: String,
            price: { type: Number, default: 0 },
          },
        ],
        serving: { type: String, default: "full" },
        isVeg: { type: Boolean, default: false },
        total: Number,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);