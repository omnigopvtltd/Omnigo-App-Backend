const { io } = require("socket.io-client");
const socket = io("http://localhost:5000");

const TEST_ORDER_ID = "6a37be024b456386538bf7b5";
const RIDER_ID = "6a4df93f7dd93821dc8a29d3";

let currentLat = 24.8607;
let currentLng = 67.0011;
let locationInterval = null; // Control Interval

socket.on("connect", () => {
  console.log(`[Rider] Connected to Socket Server. ID: ${socket.id}`);
  
  // Rider join the same for listening the updates 
  socket.emit("joinOrderTracking", TEST_ORDER_ID);
  console.log(`[Rider] Watching order_${TEST_ORDER_ID} status before moving...`);
});

function startLocationStreaming() {
  if (!locationInterval) {
    console.log("🚀 [MATCH] Starting automated location stream...");

    locationInterval = setInterval(() => {
      currentLat += 0.0005;
      currentLng += 0.0005;

      socket.emit("updateRiderLocation", {
        orderId: TEST_ORDER_ID,
        riderId: RIDER_ID,
        latitude: currentLat,
        longitude: currentLng
      });

      console.log(`[Streaming Coordinates] -> Lat: ${currentLat.toFixed(4)}, Lng: ${currentLng.toFixed(4)}`);
    }, 3000);
  }
}

function stopLocationStreaming() {
  if (locationInterval) {
    console.log("🏁 Stopping background streaming...");
    clearInterval(locationInterval);
    locationInterval = null;
  }
}

//  TRIGGER ENGINE: Start tracking after order update status to 'ongoing' or 'confirmed'
socket.on("orderTrackingStatusLive", (data) => {
  console.log(`[Rider App Event] Order status changed to: ${data.status}`);

  if (data.status === "ongoing" || data.status === "confirmed") {
    startLocationStreaming();
  }
  if (data.status === "delivered") {
    stopLocationStreaming();
  }

//   if ((data.status === "ongoing" || data.status === "confirmed") && !locationInterval) {
    
//     console.log("[MATCH] Order Accepted by System! Starting automated location stream...");

//     // background updates after every 3 seconds to simulate rider movement
//     locationInterval = setInterval(() => {
//       currentLat += 0.0005;
//       currentLng += 0.0005;

//       socket.emit("updateRiderLocation", {
//         orderId: TEST_ORDER_ID,
//         riderId: RIDER_ID,
//         latitude: currentLat,
//         longitude: currentLng
//       });

//       console.log(`[Streaming Coordinates] -> Lat: ${currentLat.toFixed(4)}, Lng: ${currentLng.toFixed(4)}`);
//     }, 3000);
//   }

  // CLose the stream after order delivered
//   if (data.status === "delivered" && locationInterval) {
//     console.log("🏁 Order Delivered! Stopping background streaming...");
//     clearInterval(locationInterval);
//     locationInterval = null;
//   }
});

// For assign the rider event, we can also trigger the location stream if not already started
socket.on("riderAssignedLive", (data) => {
    console.log("[Rider Assignment Event] Rider has been assigned to the order:", data);

    if (data.status === "ongoing" || data.status === "confirmed") {
        startLocationStreaming();
    }
});

socket.on("disconnect", () => {
  console.log("[Rider] Geolocation streaming stopped.");
  if(locationInterval) clearInterval(locationInterval);
});