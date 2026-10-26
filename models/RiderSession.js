// const mongoose = require("mongoose");

// const riderSessionSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true, trim: true },
//     description: { type: String, default: "" },
//     status: {
//       type: String,
//       enum: ["pending","in_progress", "booked", "completed", "expired", "cancelled"],
//       default: "pending",
//     },

//     requiredOrders: { type: Number, required: true, min: 1, default: 6 },
//     bonusAmount: { type: Number, required: true, min: 0 },
//     isBonusEligible: {
//       type: Boolean,
//       default: false,
//     },
    
//     // Optional wallet minimum a rider must hold to join (acts like the same
//     // "commitment" idea as the order float in Option 1).
//     minWalletBalance: { type: Number, default: 0 },

//     // Optional time limit to finish once joined, in hours. Default 8 hours for example
//     timeLimitHours: { type: Number, default: 8 },
//     // Dynamically calculated: startedAt + timeLimitHours
//     sessionEndTime: {
//       type: Date,
//       // required: true,
//     },
//     isActive: { type: Boolean, default: true },
//     startDate: { type: Date },
//     endDate: { type: Date },
//   },
//   { timestamps: true },
// );

// // Pre-validate hook: Start Date aur End Date auto calculate karne ke liye
// riderSessionSchema.pre("validate", function (next) {
//   // 1. Agar startDate nahi di gayi, to current time ko startDate bana do
//   if (!this.startDate) {
//     this.startDate = new Date();
//   }

//   // 2. Agar timeLimitHours maujood hai, to endDate = startDate + timeLimitHours
//   if (this.timeLimitHours && !this.endDate) {
//     const end = new Date(this.startDate);
//     end.setHours(end.getHours() + this.timeLimitHours);
//     this.endDate = end;
//   }

//   // 3. Validation check
//   if (this.endDate < this.startDate) {
//     return next(new Error("endDate must be after startDate"));
//   }

//   next();
// });

// riderSessionSchema.methods.isCurrentlyJoinable = function () {
//   const now = new Date();
//   return this.isActive && now >= this.startDate && now <= this.endDate;
// };

// module.exports = mongoose.model("RiderSession", riderSessionSchema);


///////////////////////////////////////////////////////////////////////


const mongoose = require("mongoose");

// Session = admin ka "template/offer". Rider ki progress yahan nahi, participation mein hoti hai.
const riderSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    requiredOrders: { type: Number, required: true, min: 1, default: 6 },
    bonusAmount: { type: Number, required: true, min: 0 },
    minWalletBalance: { type: Number, default: 0, min: 0 },
    // Join karne ke baad rider ko kitne ghante milenge
    timeLimitHours: { type: Number, default: 8, min: 1 },
    // Session ki "join window": is dauran rider join kar sakta hai
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

riderSessionSchema.pre("validate", function (next) {
  if (!this.startDate) this.startDate = new Date();
  if (!this.endDate) {
    this.endDate = new Date(
      this.startDate.getTime() + (this.timeLimitHours || 8) * 60 * 60 * 1000,
    );
  }
  if (this.endDate <= this.startDate) {
    return next(new Error("endDate must be after startDate"));
  }
  next();
});

riderSessionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

riderSessionSchema.methods.isCurrentlyJoinable = function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

module.exports = mongoose.model("RiderSession", riderSessionSchema);
