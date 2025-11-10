/**
 * NWS API Integration
 * Handles all interactions with the National Weather Service API
 */

class NWSAPI {
    constructor() {
        this.baseURL = 'https://api.weather.gov';
        this.userAgent = 'Snow Forecast Algorithm Comparison App';
    }

    /**
     * Make a fetch request with proper error handling
     */
    async fetch(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Fetch Error:', error);
            throw error;
        }
    }

    /**
     * Get grid point information from coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Object} Grid point data
     */
    async getGridPoint(lat, lon) {
        // Round to 4 decimal places as per NWS API requirements
        const roundedLat = Math.round(lat * 10000) / 10000;
        const roundedLon = Math.round(lon * 10000) / 10000;

        const url = `${this.baseURL}/points/${roundedLat},${roundedLon}`;
        const data = await this.fetch(url);

        return {
            gridId: data.properties.gridId,
            gridX: data.properties.gridX,
            gridY: data.properties.gridY,
            forecast: data.properties.forecast,
            forecastHourly: data.properties.forecastHourly,
            forecastGridData: data.properties.forecastGridData,
            observationStations: data.properties.observationStations,
            city: data.properties.relativeLocation.properties.city,
            state: data.properties.relativeLocation.properties.state
        };
    }

    /**
     * Get forecast data for a grid point
     */
    async getForecast(gridId, gridX, gridY) {
        const url = `${this.baseURL}/gridpoints/${gridId}/${gridX},${gridY}/forecast`;
        return await this.fetch(url);
    }

    /**
     * Get hourly forecast data
     */
    async getHourlyForecast(gridId, gridX, gridY) {
        const url = `${this.baseURL}/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`;
        return await this.fetch(url);
    }

    /**
     * Get detailed grid data (includes temperature, humidity, etc. at various levels)
     */
    async getGridData(gridId, gridX, gridY) {
        const url = `${this.baseURL}/gridpoints/${gridId}/${gridX},${gridY}`;
        return await this.fetch(url);
    }

    /**
     * Get observation stations near a point
     */
    async getObservationStations(lat, lon) {
        const gridPoint = await this.getGridPoint(lat, lon);
        const data = await this.fetch(gridPoint.observationStations);
        return data.features;
    }

    /**
     * Get latest observation from a station
     */
    async getLatestObservation(stationId) {
        const url = `${this.baseURL}/stations/${stationId}/observations/latest`;
        return await this.fetch(url);
    }

    /**
     * Get extended hourly forecast data for all available periods
     */
    async getExtendedHourlyForecast(gridId, gridX, gridY) {
        const hourlyForecast = await this.getHourlyForecast(gridId, gridX, gridY);
        const periods = hourlyForecast.properties.periods;

        // Process all hourly periods (typically 156 hours / 6.5 days)
        const hourlyData = periods.map(period => {
            const temp = period.temperature;
            const tempF = period.temperatureUnit === 'F' ? temp : (temp * 9/5) + 32;

            // Extract precipitation probability
            const precipProb = period.probabilityOfPrecipitation?.value || 0;

            // Estimate liquid precipitation (rough estimate based on probability)
            let liquidPrecip = 0;
            if (precipProb > 70) {
                liquidPrecip = 0.10; // Heavy
            } else if (precipProb > 40) {
                liquidPrecip = 0.05; // Moderate
            } else if (precipProb > 20) {
                liquidPrecip = 0.02; // Light
            }

            // Extract wind speed
            const windSpeed = period.windSpeed;

            // Extract relative humidity from dewpoint if available
            const dewpoint = period.dewpoint?.value;
            let relHumidity = 70; // default
            if (dewpoint !== null && dewpoint !== undefined) {
                const dewpointF = (dewpoint * 9/5) + 32;
                // Approximate RH from temp and dewpoint
                relHumidity = 100 - 5 * (tempF - dewpointF);
                relHumidity = Math.max(0, Math.min(100, relHumidity));
            }

            return {
                startTime: new Date(period.startTime),
                endTime: new Date(period.endTime),
                temperature: tempF,
                dewpoint: dewpoint,
                relativeHumidity: Math.round(relHumidity),
                windSpeed: windSpeed,
                windDirection: period.windDirection,
                precipProbability: precipProb,
                liquidPrecip: liquidPrecip,
                shortForecast: period.shortForecast,
                isDaytime: period.isDaytime
            };
        });

        return hourlyData;
    }

    /**
     * Extract weather parameters needed for snow algorithms
     */
    async getWeatherParameters(lat, lon) {
        try {
            // Get grid point info
            const gridPoint = await this.getGridPoint(lat, lon);

            // Get detailed grid data
            const gridData = await this.getGridData(gridPoint.gridId, gridPoint.gridX, gridPoint.gridY);

            // Get hourly forecast for precipitation info
            const hourlyForecast = await this.getHourlyForecast(gridPoint.gridId, gridPoint.gridX, gridPoint.gridY);

            // Get extended hourly data for charts
            const extendedHourlyData = await this.getExtendedHourlyForecast(gridPoint.gridId, gridPoint.gridX, gridPoint.gridY);

            // Try to get current observations
            let currentObs = null;
            try {
                const stations = await this.getObservationStations(lat, lon);
                if (stations && stations.length > 0) {
                    currentObs = await this.getLatestObservation(stations[0].properties.stationIdentifier);
                }
            } catch (error) {
                console.warn('Could not fetch observations:', error);
            }

            // Extract parameters
            const props = gridData.properties;

            // Get current/first forecast values
            const getCurrentValue = (param) => {
                if (!param || !param.values || param.values.length === 0) return null;
                return param.values[0].value;
            };

            // Surface temperature
            let surfaceTemp = getCurrentValue(props.temperature);
            if (surfaceTemp !== null) {
                // Convert from Celsius to Fahrenheit
                surfaceTemp = (surfaceTemp * 9/5) + 32;
            }

            // Try to get from observations if available
            if (currentObs && currentObs.properties.temperature.value !== null) {
                const obsTemp = currentObs.properties.temperature.value;
                surfaceTemp = (obsTemp * 9/5) + 32;
            }

            // Relative humidity
            let relativeHumidity = getCurrentValue(props.relativeHumidity);
            if (relativeHumidity !== null) {
                relativeHumidity = Math.round(relativeHumidity);
            }

            // Try from observations
            if (currentObs && currentObs.properties.relativeHumidity.value !== null) {
                relativeHumidity = Math.round(currentObs.properties.relativeHumidity.value);
            }

            // Quantitative Precipitation Forecast (QPF)
            let qpf = getCurrentValue(props.quantitativePrecipitation);
            if (qpf !== null) {
                // Convert from mm to inches
                qpf = qpf / 25.4;
            }

            // If no QPF in grid data, try hourly forecast
            if ((qpf === null || qpf === 0) && hourlyForecast.properties.periods.length > 0) {
                const nextPeriod = hourlyForecast.properties.periods[0];
                if (nextPeriod.probabilityOfPrecipitation?.value > 30) {
                    // Estimate based on probability and typical values
                    qpf = 0.1; // Default to 0.1 inches for demonstration
                }
            }

            // Default QPF for demonstration if none available
            if (qpf === null || qpf === 0) {
                qpf = 0.1;
            }

            // Estimate 850mb and 700mb temperatures from surface temp and standard lapse rate
            // This is an approximation - real implementation would use model data
            const temp850 = surfaceTemp ? surfaceTemp - 10 : null;
            const temp700 = surfaceTemp ? surfaceTemp - 20 : null;

            // Estimate thickness from temperature (rough approximation)
            // 540 dam corresponds to ~32°F average temp in column
            let thickness = null;
            if (surfaceTemp !== null) {
                // Very rough estimate: warmer = thicker
                thickness = 520 + (surfaceTemp - 32) * 0.5;
                thickness = Math.round(thickness);
            }

            // Precipitation rate (estimate)
            let precipRate = 0.05; // Default to light precipitation
            if (qpf > 0.5) {
                precipRate = 0.2; // Heavy
            } else if (qpf > 0.2) {
                precipRate = 0.1; // Moderate
            }

            // Elevation (approximate from grid data)
            let elevation = getCurrentValue(props.elevation);
            if (elevation !== null) {
                // Convert meters to feet
                elevation = elevation * 3.28084;
            } else {
                elevation = 0;
            }

            return {
                location: {
                    lat: lat,
                    lon: lon,
                    city: gridPoint.city,
                    state: gridPoint.state,
                    gridId: gridPoint.gridId,
                    gridX: gridPoint.gridX,
                    gridY: gridPoint.gridY
                },
                parameters: {
                    surfaceTemp: surfaceTemp,
                    temp850: temp850,
                    temp700: temp700,
                    thickness: thickness,
                    relativeHumidity: relativeHumidity || 75,
                    precipRate: precipRate,
                    liquidPrecip: qpf,
                    elevation: elevation
                },
                forecast: hourlyForecast.properties.periods[0],
                hourlyData: extendedHourlyData,
                rawData: {
                    gridData: props,
                    observation: currentObs
                }
            };

        } catch (error) {
            console.error('Error getting weather parameters:', error);
            throw new Error(`Failed to fetch weather data: ${error.message}`);
        }
    }

    /**
     * Get forecast summary for display
     */
    async getForecastSummary(lat, lon) {
        try {
            const gridPoint = await this.getGridPoint(lat, lon);
            const forecast = await this.getForecast(gridPoint.gridId, gridPoint.gridX, gridPoint.gridY);

            const periods = forecast.properties.periods;
            const currentPeriod = periods[0];

            return {
                location: `${gridPoint.city}, ${gridPoint.state}`,
                period: currentPeriod.name,
                temperature: currentPeriod.temperature,
                temperatureUnit: currentPeriod.temperatureUnit,
                windSpeed: currentPeriod.windSpeed,
                windDirection: currentPeriod.windDirection,
                shortForecast: currentPeriod.shortForecast,
                detailedForecast: currentPeriod.detailedForecast,
                icon: currentPeriod.icon
            };
        } catch (error) {
            console.error('Error getting forecast summary:', error);
            throw error;
        }
    }
}

// Make available globally
window.NWSAPI = NWSAPI;
