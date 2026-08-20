const axios = require("axios");

/**
 * Calculates multi-stop routing (Rider -> Stop 1 -> Stop 2 -> Customer)
 * @param {Array} waypoints Array of [lng, lat] coordinates in sequential order
 */
exports.getMultiStopRoute = async (waypoints) => {
  try {
    // OSRM format: lng1,lat1;lng2,lat2;lng3,lat3
    const coordString = waypoints.map((coord) => `${coord[0]},${coord[1]}`).join(";");
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;

    const response = await axios.get(osrmUrl);

    if (response.data.code !== "Ok") {
      throw new Error("Routing service failed to calculate path");
    }

    const route = response.data.routes[0];

    return {
      totalDistanceKm: Number((route.distance / 1000).toFixed(2)), // meters to km
      totalDurationMin: Math.ceil(route.duration / 60), // seconds to minutes
      routeGeometry: route.geometry, // GeoJSON line string coordinates for Flutter polyline
      legs: route.legs.map((leg) => ({
        distanceKm: Number((leg.distance / 1000).toFixed(2)),
        durationMin: Math.ceil(leg.duration / 60),
      })),
    };
  } catch (error) {
    console.error("OSRM Routing Error:", error.message);
    throw error;
  }
};