/**
 * NWS API Integration
 * Handles all interactions with the National Weather Service API
 */

class NWSAPI {
    constructor() {
        this.baseURL = 'https://api.weather.gov';
        this.userAgent = 'Snow Forecast Algorithm Comparison App';
        this.elevationAPI = 'https://api.open-elevation.com/api/v1/lookup';
    }

    /**
     * Get elevation for a specific coordinate
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {number} Elevation in meters
     */
    async getElevation(lat, lon) {
        try {
            const url = `${this.elevationAPI}?locations=${lat},${lon}`;
            const response = await fetch(url);
            if (!response.ok) {
                console.warn('Elevation API failed, using fallback');
                return null;
            }
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].elevation; // in meters
            }
            return null;
        } catch (error) {
            console.warn('Error fetching elevation:', error);
            return null;
        }
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

            // Get elevation for the specific clicked point
            let clickedElevationMeters = await this.getElevation(lat, lon);
            let clickedElevationFeet = clickedElevationMeters ? clickedElevationMeters * 3.28084 : null;

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

            // Get grid elevation from data
            let gridElevation = getCurrentValue(props.elevation);
            if (gridElevation !== null) {
                // Convert meters to feet
                gridElevation = gridElevation * 3.28084;
            } else {
                gridElevation = 0;
            }

            // Use clicked elevation if available, otherwise use grid elevation
            let targetElevation = clickedElevationFeet !== null ? clickedElevationFeet : gridElevation;

            // Precipitation rate (estimate)
            let precipRate = 0.05; // Default to light precipitation
            if (qpf > 0.5) {
                precipRate = 0.2; // Heavy
            } else if (qpf > 0.2) {
                precipRate = 0.1; // Moderate
            }

            // Create initial parameters object from grid data
            const gridParameters = {
                surfaceTemp: surfaceTemp,
                temp850: surfaceTemp ? surfaceTemp - 10 : null,
                temp700: surfaceTemp ? surfaceTemp - 20 : null,
                thickness: surfaceTemp ? Math.round(520 + (surfaceTemp - 32) * 0.5) : null,
                relativeHumidity: relativeHumidity || 75,
                precipRate: precipRate,
                liquidPrecip: qpf,
                elevation: gridElevation
            };

            // Apply atmospheric corrections if elevation differs from grid point
            let correctedParameters = gridParameters;
            let elevationCorrectionApplied = false;

            if (Math.abs(targetElevation - gridElevation) > 100 && typeof AtmosphericCorrections !== 'undefined') {
                // Significant elevation difference - apply corrections
                console.log(`Applying atmospheric corrections for elevation difference: ${targetElevation - gridElevation} ft`);
                correctedParameters = AtmosphericCorrections.applyElevationCorrections(
                    gridParameters,
                    gridElevation,
                    targetElevation
                );
                elevationCorrectionApplied = true;

                // Apply corrections to hourly data as well
                const correctedHourlyData = AtmosphericCorrections.applyHourlyElevationCorrections(
                    extendedHourlyData,
                    gridElevation,
                    targetElevation
                );

                return {
                    location: {
                        lat: lat,
                        lon: lon,
                        city: gridPoint.city,
                        state: gridPoint.state,
                        gridId: gridPoint.gridId,
                        gridX: gridPoint.gridX,
                        gridY: gridPoint.gridY,
                        gridElevation: Math.round(gridElevation),
                        actualElevation: Math.round(targetElevation),
                        elevationCorrected: elevationCorrectionApplied
                    },
                    parameters: correctedParameters,
                    forecast: hourlyForecast.properties.periods[0],
                    hourlyData: correctedHourlyData,
                    rawData: {
                        gridData: props,
                        observation: currentObs,
                        gridParameters: gridParameters
                    }
                };
            }

            // No correction needed - return original data
            return {
                location: {
                    lat: lat,
                    lon: lon,
                    city: gridPoint.city,
                    state: gridPoint.state,
                    gridId: gridPoint.gridId,
                    gridX: gridPoint.gridX,
                    gridY: gridPoint.gridY,
                    gridElevation: Math.round(gridElevation),
                    actualElevation: Math.round(targetElevation),
                    elevationCorrected: false
                },
                parameters: correctedParameters,
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
