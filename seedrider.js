// seedRiders.js
const mongoose = require("mongoose");
const User = require("./models/User"); // Adjust path to your User model
require("dotenv").config();

const seedTestRiders = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("MongoDB Connected...");

    // Find rider users or update existing ones
    const riders = await User.find({ role: "rider" });

    if (riders.length === 0) {
      console.log("No riders found in DB. Creating test rider...");
      await User.create({
        name: "Rider Afnan",
        email: "afnan.rider@example.com",
        password: "password123",
        role: "rider",
        phone: "03001234567",
        riderProfile: {
          isOnline: true,
          vehicleType: "bike",
          currentLocation: {
            lat: 24.8607, // Karachi Lat (or 45 for relative percentage)
            lng: 67.0011, // Karachi Lng (or 50 for relative percentage)
            updatedAt: new Date(),
          },
        },
      });
    } else {
      console.log(`Updating ${riders.length} rider(s) to online...`);
      await User.updateMany(
        { role: "rider" },
        {
          $set: {
            "riderProfile.isOnline": true,
            "riderProfile.currentLocation": {
              lat: 45, // Central position on grid map
              lng: 50,
              updatedAt: new Date(),
            },
          },
        }
      );
    }

    console.log("✅ Riders are now ONLINE!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding riders:", error);
    process.exit(1);
  }
};

seedTestRiders();