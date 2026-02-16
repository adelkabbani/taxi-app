const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Geo-calculation utilities
 */

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// Calculate heading/bearing between two points
const calculateHeading = (lat1, lng1, lat2, lng2) => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const heading = ((θ * 180) / Math.PI + 360) % 360; // Convert to degrees

    return heading;
};

/**
 * Geo-check validation for driver arrival
 */
const validateArrivalLocation = (driverLat, driverLng, pickupLat, pickupLng, accuracy) => {
    const maxRadius = parseInt(process.env.ARRIVAL_GEO_CHECK_RADIUS_METERS) || 150;
    const maxAccuracy = parseInt(process.env.GPS_ACCURACY_THRESHOLD_METERS) || 50;

    const distance = calculateDistance(driverLat, driverLng, pickupLat, pickupLng);

    return {
        passed: distance <= maxRadius && (accuracy || 0) <= maxAccuracy,
        distance,
        withinRadius: distance <= maxRadius,
        accuracyAcceptable: (accuracy || 0) <= maxAccuracy,
        accuracy
    };
};

/**
 * Check if driver is heading toward destination
 */
const isHeadingToward = (currentLat, currentLng, previousLat, previousLng, destLat, destLng) => {
    // Calculate heading from previous to current position
    const currentHeading = calculateHeading(previousLat, previousLng, currentLat, currentLng);

    // Calculate ideal heading toward destination
    const idealHeading = calculateHeading(currentLat, currentLng, destLat, destLng);

    // Calculate heading difference
    let headingDiff = Math.abs(currentHeading - idealHeading);
    if (headingDiff > 180) {
        headingDiff = 360 - headingDiff;
    }

    // Consider "toward" if within 90 degrees of ideal heading
    return headingDiff <= 90;
};

/**
 * Calculate ETA based on distance and average speed
 */
const calculateETA = (distanceMeters, averageSpeedKmh = 40) => {
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / averageSpeedKmh;
    const timeMinutes = Math.ceil(timeHours * 60);

    return {
        minutes: timeMinutes,
        estimatedArrival: new Date(Date.now() + timeMinutes * 60 * 1000)
    };
};

module.exports = {
    calculateDistance,
    calculateHeading,
    validateArrivalLocation,
    isHeadingToward,
    calculateETA
};
