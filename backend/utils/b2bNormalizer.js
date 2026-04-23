/**
 * Normalizes diverse aggregator payloads into a standard format.
 * Maps external vehicle types (Booking, Talixo, Transferz) to internal enums.
 */
exports.normalizePayload = (payload) => {
    // 1. Detect Source & Extract Data (Handling multiple common aggregator keys)
    let externalType = payload.vehicle_type || payload.category || payload.vehicle_class || 'unknown';
    let offeredPrice = payload.price?.amount || payload.price_offer || payload.total_price || 0;

    // 2. Map external labels to internal vehicle_type enum
    const typeMap = {
        'Economy': 'economy_sedan',
        'Standard': 'sedan',
        'Business': 'business',
        'Van': 'van',
        'Business Van': 'business_van',
        'First Class': 'luxury',
        'Accessible': 'accessible'
    };

    // Normalize: Map if known, otherwise lowercase-snake-case
    const internalVehicleType = typeMap[externalType] || externalType.toLowerCase().replace(/\s+/g, '_');

    return {
        vehicleType: internalVehicleType,
        offeredPrice: parseFloat(offeredPrice)
    };
};
