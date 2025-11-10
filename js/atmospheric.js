/**
 * Atmospheric Corrections and Calculations
 * Handles elevation-based adjustments for temperature, pressure, and other parameters
 */

class AtmosphericCorrections {
    /**
     * Standard atmospheric lapse rate (°F per 1000 feet)
     * Typical values: 3.5-6.5°F per 1000 ft
     * Using 5.5°F per 1000 ft as a reasonable average
     */
    static LAPSE_RATE_F_PER_1000FT = 5.5;

    /**
     * Dry adiabatic lapse rate (°C per 1000m)
     */
    static DRY_ADIABATIC_LAPSE_RATE = 9.8;

    /**
     * Moist adiabatic lapse rate (°C per 1000m) - average
     */
    static MOIST_ADIABATIC_LAPSE_RATE = 6.0;

    /**
     * Standard pressure at sea level (mb)
     */
    static STANDARD_PRESSURE_MB = 1013.25;

    /**
     * Convert meters to feet
     */
    static metersToFeet(meters) {
        return meters * 3.28084;
    }

    /**
     * Convert feet to meters
     */
    static feetToMeters(feet) {
        return feet / 3.28084;
    }

    /**
     * Calculate pressure at a given elevation using barometric formula
     * @param {number} elevationFeet - Elevation in feet
     * @param {number} seaLevelPressureMb - Sea level pressure in millibars
     * @returns {number} Pressure in millibars
     */
    static calculatePressure(elevationFeet, seaLevelPressureMb = this.STANDARD_PRESSURE_MB) {
        const elevationMeters = this.feetToMeters(elevationFeet);
        // Barometric formula: P = P0 * exp(-Mg*h / RT)
        // Simplified: P = P0 * (1 - 0.0065*h/288.15)^5.255
        const pressure = seaLevelPressureMb * Math.pow(1 - (0.0065 * elevationMeters / 288.15), 5.255);
        return pressure;
    }

    /**
     * Calculate standard atmosphere pressure level from elevation
     * Returns approximate pressure level (850mb, 700mb, etc.)
     * @param {number} elevationFeet - Elevation in feet
     * @returns {number} Approximate pressure level in mb
     */
    static elevationToPressureLevel(elevationFeet) {
        return this.calculatePressure(elevationFeet);
    }

    /**
     * Adjust temperature for elevation difference
     * @param {number} tempF - Temperature at reference elevation (°F)
     * @param {number} fromElevationFt - Reference elevation (feet)
     * @param {number} toElevationFt - Target elevation (feet)
     * @param {number} relativeHumidity - Relative humidity (0-100) for lapse rate selection
     * @returns {number} Adjusted temperature in °F
     */
    static adjustTemperatureForElevation(tempF, fromElevationFt, toElevationFt, relativeHumidity = 50) {
        const elevationDiffFt = toElevationFt - fromElevationFt;
        const elevationDiff1000Ft = elevationDiffFt / 1000;

        // Use different lapse rates based on humidity
        // Dry air: 5.5°F per 1000 ft
        // Moist air: 3.3°F per 1000 ft (approximately)
        let lapseRate = this.LAPSE_RATE_F_PER_1000FT;

        if (relativeHumidity > 80) {
            lapseRate = 3.3; // Moist adiabatic
        } else if (relativeHumidity > 60) {
            lapseRate = 4.4; // Average
        }

        // Temperature decreases with altitude
        const adjustedTemp = tempF - (lapseRate * elevationDiff1000Ft);
        return adjustedTemp;
    }

    /**
     * Adjust 850mb temperature for elevation
     * 850mb is approximately at 5,000 feet
     */
    static adjust850mbTemp(surfaceTempF, surfaceElevationFt, relativeHumidity = 50) {
        const target850mbElevation = 5000; // feet
        return this.adjustTemperatureForElevation(
            surfaceTempF,
            surfaceElevationFt,
            target850mbElevation,
            relativeHumidity
        );
    }

    /**
     * Adjust 700mb temperature for elevation
     * 700mb is approximately at 10,000 feet
     */
    static adjust700mbTemp(surfaceTempF, surfaceElevationFt, relativeHumidity = 50) {
        const target700mbElevation = 10000; // feet
        return this.adjustTemperatureForElevation(
            surfaceTempF,
            surfaceElevationFt,
            target700mbElevation,
            relativeHumidity
        );
    }

    /**
     * Calculate 1000-500mb thickness adjusted for elevation
     * Thickness is proportional to the mean virtual temperature of the layer
     * @param {number} surfaceTempF - Surface temperature in °F
     * @param {number} elevationFt - Surface elevation in feet
     * @returns {number} Thickness in decameters
     */
    static calculateThickness(surfaceTempF, elevationFt) {
        // Base thickness calculation
        // 540 dam corresponds to freezing (32°F) at sea level

        // Adjust temperature for mean layer temperature
        const temp850F = this.adjust850mbTemp(surfaceTempF, elevationFt);
        const temp700F = this.adjust700mbTemp(surfaceTempF, elevationFt);

        // Mean temperature of 1000-500mb layer (weighted average)
        const meanTempF = (surfaceTempF * 0.4) + (temp850F * 0.35) + (temp700F * 0.25);
        const meanTempC = (meanTempF - 32) * 5 / 9;

        // Thickness formula: thickness ≈ 4.3 * T_mean (in Kelvin) + adjustment
        const meanTempK = meanTempC + 273.15;

        // Simplified thickness calculation
        // At sea level, 32°F (0°C) gives ~540 dam
        // Each degree C change in mean temp changes thickness by ~2 dam
        const baseThickness = 540;
        const thicknessAdjustment = meanTempC * 2;

        let thickness = baseThickness + thicknessAdjustment;

        // Additional elevation adjustment
        // Higher elevations have lower surface pressure, affecting thickness
        const elevationAdjustment = elevationFt / 5000 * 9; // ~9 dam per 5000 ft
        thickness += elevationAdjustment;

        return Math.round(thickness);
    }

    /**
     * Adjust relative humidity for elevation
     * RH generally increases slightly with altitude in stable conditions
     * @param {number} rh - Relative humidity at reference elevation
     * @param {number} elevationDiffFt - Elevation difference (feet)
     * @returns {number} Adjusted relative humidity
     */
    static adjustRelativeHumidity(rh, elevationDiffFt) {
        // Small increase with altitude in stable conditions
        // Approximately 2% per 1000 feet
        const adjustment = (elevationDiffFt / 1000) * 2;
        const adjustedRH = rh + adjustment;
        return Math.max(0, Math.min(100, adjustedRH));
    }

    /**
     * Apply comprehensive atmospheric corrections to weather data
     * @param {Object} gridWeatherData - Weather data from grid point
     * @param {number} gridElevationFt - Grid point elevation (feet)
     * @param {number} targetElevationFt - Target elevation (feet)
     * @returns {Object} Corrected weather parameters
     */
    static applyElevationCorrections(gridWeatherData, gridElevationFt, targetElevationFt) {
        const elevationDiff = targetElevationFt - gridElevationFt;

        console.log(`Applying elevation corrections: Grid=${gridElevationFt}ft, Target=${targetElevationFt}ft, Diff=${elevationDiff}ft`);

        // Adjust surface temperature
        const correctedSurfaceTemp = this.adjustTemperatureForElevation(
            gridWeatherData.surfaceTemp,
            gridElevationFt,
            targetElevationFt,
            gridWeatherData.relativeHumidity
        );

        // Calculate corrected 850mb and 700mb temperatures
        const corrected850mb = this.adjust850mbTemp(
            correctedSurfaceTemp,
            targetElevationFt,
            gridWeatherData.relativeHumidity
        );

        const corrected700mb = this.adjust700mbTemp(
            correctedSurfaceTemp,
            targetElevationFt,
            gridWeatherData.relativeHumidity
        );

        // Calculate corrected thickness
        const correctedThickness = this.calculateThickness(
            correctedSurfaceTemp,
            targetElevationFt
        );

        // Adjust relative humidity
        const correctedRH = this.adjustRelativeHumidity(
            gridWeatherData.relativeHumidity,
            elevationDiff
        );

        // Precipitation rate might be affected by orographic lift
        // Higher elevations in mountains can see increased precip
        let precipRateMultiplier = 1.0;
        if (elevationDiff > 1000) {
            // Orographic enhancement: roughly 10% increase per 1000 ft
            precipRateMultiplier = 1 + (elevationDiff / 1000) * 0.1;
        }

        const correctedPrecipRate = gridWeatherData.precipRate * precipRateMultiplier;
        const correctedLiquidPrecip = gridWeatherData.liquidPrecip * precipRateMultiplier;

        return {
            surfaceTemp: correctedSurfaceTemp,
            temp850: corrected850mb,
            temp700: corrected700mb,
            thickness: correctedThickness,
            relativeHumidity: Math.round(correctedRH),
            precipRate: correctedPrecipRate,
            liquidPrecip: correctedLiquidPrecip,
            elevation: targetElevationFt,

            // Include correction metadata
            corrections: {
                applied: true,
                gridElevation: gridElevationFt,
                targetElevation: targetElevationFt,
                elevationDifference: elevationDiff,
                temperatureAdjustment: correctedSurfaceTemp - gridWeatherData.surfaceTemp,
                thicknessAdjustment: correctedThickness - gridWeatherData.thickness,
                precipMultiplier: precipRateMultiplier
            }
        };
    }

    /**
     * Apply elevation corrections to hourly data array
     * @param {Array} hourlyData - Array of hourly weather data
     * @param {number} gridElevationFt - Grid point elevation
     * @param {number} targetElevationFt - Target elevation
     * @returns {Array} Corrected hourly data
     */
    static applyHourlyElevationCorrections(hourlyData, gridElevationFt, targetElevationFt) {
        return hourlyData.map(hour => {
            const correctedTemp = this.adjustTemperatureForElevation(
                hour.temperature,
                gridElevationFt,
                targetElevationFt,
                hour.relativeHumidity
            );

            const correctedRH = this.adjustRelativeHumidity(
                hour.relativeHumidity,
                targetElevationFt - gridElevationFt
            );

            // Orographic precip enhancement
            let precipMultiplier = 1.0;
            const elevationDiff = targetElevationFt - gridElevationFt;
            if (elevationDiff > 1000) {
                precipMultiplier = 1 + (elevationDiff / 1000) * 0.1;
            }

            return {
                ...hour,
                temperature: correctedTemp,
                relativeHumidity: Math.round(correctedRH),
                liquidPrecip: hour.liquidPrecip * precipMultiplier,
                elevationCorrected: true,
                originalTemperature: hour.temperature,
                temperatureAdjustment: correctedTemp - hour.temperature
            };
        });
    }
}

// Make available globally
window.AtmosphericCorrections = AtmosphericCorrections;
