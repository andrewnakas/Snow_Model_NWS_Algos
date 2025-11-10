/**
 * Snow Forecasting Algorithms
 * Implementation of various NOAA/NWS snow-to-liquid ratio (SLR) prediction methods
 */

class SnowAlgorithms {
    /**
     * Convert Fahrenheit to Celsius
     */
    static fToC(tempF) {
        return (tempF - 32) * 5 / 9;
    }

    /**
     * Convert Celsius to Fahrenheit
     */
    static cToF(tempC) {
        return (tempC * 9 / 5) + 32;
    }

    /**
     * Simple 10:1 Ratio Method
     * Classic baseline - assumes 10 inches of snow = 1 inch liquid
     */
    static simple10to1(liquidPrecip) {
        return {
            name: "Simple 10:1 Ratio",
            ratio: 10,
            snowfall: liquidPrecip * 10,
            confidence: "low",
            description: "Classic baseline method",
            details: "Assumes constant 10:1 ratio regardless of conditions"
        };
    }

    /**
     * Thickness Method (1000-500mb)
     * Uses atmospheric thickness to determine snow vs rain and SLR
     *
     * @param {number} thickness - 1000-500mb thickness in decameters
     * @param {number} liquidPrecip - Liquid precipitation in inches
     * @param {number} elevation - Station elevation in feet (default 0)
     */
    static thicknessMethod(thickness, liquidPrecip, elevation = 0) {
        // Adjust thickness threshold for elevation
        // Add 9 dam (90 gpm) for every 5000 feet of elevation
        const elevationAdjustment = Math.floor(elevation / 5000) * 9;
        const adjustedThreshold = 540 + elevationAdjustment;

        let ratio;
        let precipType;
        let confidence;

        if (thickness === null || thickness === undefined) {
            // Fallback if thickness data unavailable
            ratio = 10;
            precipType = "unknown";
            confidence = "low";
        } else if (thickness <= adjustedThreshold - 4) {
            // Very cold - high ratios
            ratio = 15;
            precipType = "snow";
            confidence = "high";
        } else if (thickness <= adjustedThreshold - 2) {
            ratio = 12;
            precipType = "snow";
            confidence = "high";
        } else if (thickness <= adjustedThreshold) {
            ratio = 10;
            precipType = "snow";
            confidence = "medium";
        } else if (thickness <= adjustedThreshold + 2) {
            // Marginal - mixed precip possible
            ratio = 8;
            precipType = "snow/mixed";
            confidence = "low";
        } else {
            // Too warm for snow
            ratio = 0;
            precipType = "rain";
            confidence = "high";
        }

        return {
            name: "Thickness Method",
            ratio: ratio,
            snowfall: liquidPrecip * ratio,
            confidence: confidence,
            description: `Thickness: ${thickness} dam (threshold: ${adjustedThreshold})`,
            details: `Precipitation type: ${precipType}`,
            precipType: precipType
        };
    }

    /**
     * Simple Temperature-Based SLR Method
     * Based on surface temperature with peak ratios at -12°C to -18°C
     *
     * @param {number} tempF - Surface temperature in Fahrenheit
     * @param {number} liquidPrecip - Liquid precipitation in inches
     */
    static simpleTemperature(tempF, liquidPrecip) {
        const tempC = this.fToC(tempF);
        let ratio;
        let confidence;

        if (tempC > 0) {
            // Above freezing - likely rain or wet snow
            ratio = tempC > 2 ? 0 : 5;
            confidence = "low";
        } else if (tempC >= -5) {
            // 23°F to 32°F - wet, heavy snow
            ratio = 8;
            confidence = "medium";
        } else if (tempC >= -12) {
            // 10°F to 23°F - typical snow
            ratio = 12;
            confidence = "high";
        } else if (tempC >= -18) {
            // -1°F to 10°F - optimal dendrite growth zone
            ratio = 20;
            confidence = "high";
        } else if (tempC >= -25) {
            // -13°F to -1°F - very cold, lighter snow
            ratio = 18;
            confidence = "medium";
        } else {
            // Below -13°F - extremely cold, very light snow
            ratio = 15;
            confidence = "medium";
        }

        return {
            name: "Simple Temperature Method",
            ratio: ratio,
            snowfall: liquidPrecip * ratio,
            confidence: confidence,
            description: `Temperature: ${tempF.toFixed(1)}°F (${tempC.toFixed(1)}°C)`,
            details: `Temperature-based SLR calculation`
        };
    }

    /**
     * Dendritic Growth Zone Method
     * Optimized for -12°C to -18°C where dendrite crystals produce highest ratios
     *
     * @param {number} tempF - Surface temperature in Fahrenheit
     * @param {number} liquidPrecip - Liquid precipitation in inches
     */
    static dendriticGrowthZone(tempF, liquidPrecip) {
        const tempC = this.fToC(tempF);
        let ratio;
        let confidence;
        let inZone = false;

        if (tempC > 0) {
            ratio = 0;
            confidence = "high";
        } else if (tempC >= -5) {
            ratio = 8;
            confidence = "medium";
        } else if (tempC >= -10) {
            // Approaching dendritic zone
            ratio = 15;
            confidence = "medium";
        } else if (tempC >= -12) {
            // Entering optimal zone
            ratio = 20;
            confidence = "high";
            inZone = true;
        } else if (tempC >= -15) {
            // Peak of dendritic zone
            ratio = 25;
            confidence = "high";
            inZone = true;
        } else if (tempC >= -18) {
            // Still in optimal zone
            ratio = 22;
            confidence = "high";
            inZone = true;
        } else if (tempC >= -22) {
            // Leaving optimal zone
            ratio = 17;
            confidence = "medium";
        } else {
            // Too cold for dendrites
            ratio = 12;
            confidence = "low";
        }

        return {
            name: "Dendritic Growth Zone",
            ratio: ratio,
            snowfall: liquidPrecip * ratio,
            confidence: confidence,
            description: `Temperature: ${tempF.toFixed(1)}°F (${tempC.toFixed(1)}°C)`,
            details: inZone ? "IN OPTIMAL DENDRITE ZONE (-12°C to -18°C)" : "Outside optimal zone"
        };
    }

    /**
     * Cobb-Waldstreicher Method (Simplified)
     * Layer-weighted approach considering temperature and vertical motion
     * This is a simplified version - full implementation requires complete sounding data
     *
     * @param {number} surfaceTempF - Surface temperature in Fahrenheit
     * @param {number} temp850F - 850mb temperature in Fahrenheit
     * @param {number} temp700F - 700mb temperature in Fahrenheit
     * @param {number} liquidPrecip - Liquid precipitation in inches
     * @param {number} relHumidity - Relative humidity (0-100)
     */
    static cobbWaldstreicher(surfaceTempF, temp850F, temp700F, liquidPrecip, relHumidity = 75) {
        // Convert to Celsius
        const surfaceTempC = this.fToC(surfaceTempF);
        const temp850C = this.fToC(temp850F);
        const temp700C = this.fToC(temp700F);

        // Calculate layer contributions
        const layers = [
            { temp: surfaceTempC, weight: 0.4 },
            { temp: temp850C, weight: 0.35 },
            { temp: temp700C, weight: 0.25 }
        ];

        // Only consider layers with RH > 75% (simplified - using average)
        const isHumid = relHumidity > 75;

        let weightedRatio = 0;
        let avgTemp = 0;

        for (const layer of layers) {
            // Calculate ratio for this layer based on temperature
            let layerRatio;
            const t = layer.temp;

            if (t > 0) {
                layerRatio = 0;
            } else if (t >= -5) {
                layerRatio = 8;
            } else if (t >= -12) {
                layerRatio = 12;
            } else if (t >= -15) {
                // In snow production zone
                layerRatio = isHumid ? 22 : 18;
            } else if (t >= -18) {
                layerRatio = isHumid ? 20 : 16;
            } else {
                layerRatio = 15;
            }

            weightedRatio += layerRatio * layer.weight;
            avgTemp += t * layer.weight;
        }

        // Adjust for humidity
        if (relHumidity < 70) {
            weightedRatio *= 0.9; // Reduce for dry conditions
        }

        const ratio = Math.round(weightedRatio);

        return {
            name: "Cobb-Waldstreicher Method",
            ratio: ratio,
            snowfall: liquidPrecip * ratio,
            confidence: "high",
            description: `Layer-weighted: Sfc=${surfaceTempF.toFixed(0)}°F, 850mb=${temp850F.toFixed(0)}°F, 700mb=${temp700F.toFixed(0)}°F`,
            details: `RH: ${relHumidity}%, Weighted avg temp: ${avgTemp.toFixed(1)}°C`
        };
    }

    /**
     * Byun et al. Method
     * SLR as function of temperature and precipitation rate
     * Based on: SLR = a + b*T + c*PR
     *
     * @param {number} tempF - Surface temperature in Fahrenheit
     * @param {number} precipRate - Precipitation rate in inches/hour
     * @param {number} liquidPrecip - Total liquid precipitation in inches
     */
    static byunMethod(tempF, precipRate, liquidPrecip) {
        const tempC = this.fToC(tempF);

        // Coefficients based on Byun et al. 2008
        // SLR = 18.0 - 0.5*T - 1.5*PR
        // Where T is in °C and PR is in mm/hr
        const precipRateMM = precipRate * 25.4; // Convert in/hr to mm/hr

        let ratio = 18.0 - (0.5 * tempC) - (1.5 * precipRateMM);

        // Constrain to reasonable bounds
        if (ratio < 0) ratio = 0;
        if (ratio > 30) ratio = 30;
        if (tempC > 0) ratio = 0;

        // Round to nearest integer
        ratio = Math.round(ratio);

        let confidence;
        if (tempC > -2) {
            confidence = "low";
        } else if (tempC < -20) {
            confidence = "medium";
        } else {
            confidence = "high";
        }

        return {
            name: "Byun et al. Method",
            ratio: ratio,
            snowfall: liquidPrecip * ratio,
            confidence: confidence,
            description: `Temp: ${tempF.toFixed(1)}°F, Rate: ${precipRate.toFixed(2)} in/hr`,
            details: `Accounts for precipitation intensity (heavier = lower ratio)`
        };
    }

    /**
     * Relative Humidity Adjusted Method
     * Modifies temperature-based ratios using RH to account for riming
     *
     * @param {number} tempF - Surface temperature in Fahrenheit
     * @param {number} relHumidity - Relative humidity (0-100)
     * @param {number} liquidPrecip - Liquid precipitation in inches
     */
    static humidityAdjusted(tempF, relHumidity, liquidPrecip) {
        const tempC = this.fToC(tempF);

        // Start with temperature-based ratio
        let baseRatio;
        if (tempC > 0) {
            baseRatio = 0;
        } else if (tempC >= -5) {
            baseRatio = 8;
        } else if (tempC >= -12) {
            baseRatio = 12;
        } else if (tempC >= -18) {
            baseRatio = 20;
        } else {
            baseRatio = 15;
        }

        // Adjust for humidity
        // High humidity (>80%) can cause riming, reducing ratio
        // Low humidity (<60%) can increase ratio
        let humidityFactor = 1.0;
        let adjustment = "";

        if (relHumidity > 85) {
            humidityFactor = 0.85;
            adjustment = "Heavy riming likely";
        } else if (relHumidity > 75) {
            humidityFactor = 0.92;
            adjustment = "Moderate riming possible";
        } else if (relHumidity < 60) {
            humidityFactor = 1.1;
            adjustment = "Dry snow, higher ratios";
        } else {
            adjustment = "Normal conditions";
        }

        const ratio = Math.round(baseRatio * humidityFactor);

        return {
            name: "Humidity Adjusted Method",
            ratio: ratio,
            snowfall: liquidPrecip * ratio,
            confidence: "medium",
            description: `Temp: ${tempF.toFixed(1)}°F, RH: ${relHumidity}%`,
            details: adjustment
        };
    }

    /**
     * Run all algorithms and return results
     *
     * @param {Object} weatherData - Object containing all weather parameters
     * @returns {Array} Array of algorithm results
     */
    static runAllAlgorithms(weatherData) {
        const {
            surfaceTemp,
            temp850,
            temp700,
            thickness,
            relativeHumidity,
            precipRate,
            liquidPrecip,
            elevation
        } = weatherData;

        const results = [];

        // Simple 10:1
        results.push(this.simple10to1(liquidPrecip));

        // Thickness method
        if (thickness !== null) {
            results.push(this.thicknessMethod(thickness, liquidPrecip, elevation));
        }

        // Simple temperature
        if (surfaceTemp !== null) {
            results.push(this.simpleTemperature(surfaceTemp, liquidPrecip));
        }

        // Dendritic growth zone
        if (surfaceTemp !== null) {
            results.push(this.dendriticGrowthZone(surfaceTemp, liquidPrecip));
        }

        // Cobb-Waldstreicher
        if (surfaceTemp !== null && temp850 !== null && temp700 !== null) {
            results.push(this.cobbWaldstreicher(
                surfaceTemp,
                temp850,
                temp700,
                liquidPrecip,
                relativeHumidity
            ));
        }

        // Byun method
        if (surfaceTemp !== null && precipRate !== null) {
            results.push(this.byunMethod(surfaceTemp, precipRate, liquidPrecip));
        }

        // Humidity adjusted
        if (surfaceTemp !== null && relativeHumidity !== null) {
            results.push(this.humidityAdjusted(surfaceTemp, relativeHumidity, liquidPrecip));
        }

        return results;
    }

    /**
     * Calculate hourly forecast for a specific algorithm
     *
     * @param {string} algorithmName - Name of the algorithm
     * @param {Array} hourlyData - Array of hourly weather data
     * @param {number} elevation - Elevation in feet
     * @returns {Object} Hourly forecast data
     */
    static calculateHourlyForecast(algorithmName, hourlyData, elevation = 0) {
        const hourlyResults = [];
        let cumulativeSnowfall = 0;
        let cumulativeLiquid = 0;

        for (const hour of hourlyData) {
            const temp = hour.temperature;
            const liquid = hour.liquidPrecip;
            const rh = hour.relativeHumidity;

            let result;

            // Calculate based on algorithm type
            switch (algorithmName) {
                case "Simple 10:1 Ratio":
                    result = this.simple10to1(liquid);
                    break;

                case "Thickness Method":
                    // Estimate thickness from temperature
                    const thickness = temp !== null ? Math.round(520 + (temp - 32) * 0.5) : null;
                    result = this.thicknessMethod(thickness, liquid, elevation);
                    break;

                case "Simple Temperature Method":
                    result = this.simpleTemperature(temp, liquid);
                    break;

                case "Dendritic Growth Zone":
                    result = this.dendriticGrowthZone(temp, liquid);
                    break;

                case "Cobb-Waldstreicher Method":
                    const temp850 = temp - 10;
                    const temp700 = temp - 20;
                    result = this.cobbWaldstreicher(temp, temp850, temp700, liquid, rh);
                    break;

                case "Byun et al. Method":
                    const precipRate = liquid; // Assume hourly rate
                    result = this.byunMethod(temp, precipRate, liquid);
                    break;

                case "Humidity Adjusted Method":
                    result = this.humidityAdjusted(temp, rh, liquid);
                    break;

                default:
                    result = this.simple10to1(liquid);
            }

            cumulativeSnowfall += result.snowfall;
            cumulativeLiquid += liquid;

            hourlyResults.push({
                time: hour.startTime,
                temperature: temp,
                relativeHumidity: rh,
                liquidPrecip: liquid,
                ratio: result.ratio,
                snowfall: result.snowfall,
                cumulativeSnowfall: cumulativeSnowfall,
                cumulativeLiquid: cumulativeLiquid,
                windSpeed: hour.windSpeed,
                precipProbability: hour.precipProbability
            });
        }

        return {
            hourly: hourlyResults,
            totals: {
                snowfall: cumulativeSnowfall,
                liquid: cumulativeLiquid,
                averageRatio: cumulativeLiquid > 0 ? cumulativeSnowfall / cumulativeLiquid : 0,
                duration: hourlyResults.length
            }
        };
    }
}

// Make available globally
window.SnowAlgorithms = SnowAlgorithms;
