/**
 * Main Application Logic
 * Ties together the map, API, and algorithms
 */

class SnowForecastApp {
    constructor() {
        this.map = null;
        this.api = null;
        this.currentWeatherData = null;
        this.algorithmResults = null;
    }

    /**
     * Initialize the application
     */
    initialize() {
        // Initialize map
        this.map = new SnowForecastMap('map');
        this.map.initialize();

        // Initialize API
        this.api = new NWSAPI();

        // Set location select callback
        this.map.setLocationSelectCallback((lat, lon) => {
            this.handleLocationSelect(lat, lon);
        });

        // Check if there's a default location in URL params
        this.checkURLParams();

        console.log('Snow Forecast Application initialized');
    }

    /**
     * Check URL parameters for default location
     */
    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const lat = params.get('lat');
        const lon = params.get('lon');

        if (lat && lon) {
            this.map.setMarker(parseFloat(lat), parseFloat(lon));
        }
    }

    /**
     * Handle location selection
     */
    async handleLocationSelect(lat, lon) {
        try {
            // Update coordinate display
            this.updateCoordinateDisplay(lat, lon);

            // Show loading indicator
            this.showLoading(true);
            this.hideError();
            this.hideResults();

            // Fetch weather data
            console.log(`Fetching weather data for ${lat}, ${lon}`);
            const weatherData = await this.api.getWeatherParameters(lat, lon);

            this.currentWeatherData = weatherData;

            // Update map marker with location info
            this.map.updateMarkerPopup(weatherData.location);

            // Display weather data
            this.displayWeatherData(weatherData);

            // Run algorithms
            this.runAlgorithms(weatherData.parameters);

            // Hide loading
            this.showLoading(false);

            // Update URL
            this.updateURL(lat, lon);

        } catch (error) {
            console.error('Error handling location select:', error);
            this.showError(`Error fetching weather data: ${error.message}. This location may be outside the NWS coverage area (continental US, Alaska, Hawaii, Puerto Rico, Guam).`);
            this.showLoading(false);
        }
    }

    /**
     * Update coordinate display
     */
    updateCoordinateDisplay(lat, lon) {
        const coordsElement = document.getElementById('selected-coords');
        if (coordsElement) {
            coordsElement.innerHTML = `
                <strong>Selected Location:</strong>
                ${lat.toFixed(4)}°N, ${Math.abs(lon).toFixed(4)}°${lon < 0 ? 'W' : 'E'}
            `;
        }
    }

    /**
     * Display weather data
     */
    displayWeatherData(weatherData) {
        const weatherSection = document.getElementById('weather-data');
        const summaryElement = document.getElementById('forecast-summary');

        if (!weatherSection || !summaryElement) return;

        const { location, parameters, forecast } = weatherData;

        let html = `
            <div class="forecast-item">
                <label>Location</label>
                <div class="value" style="font-size: 1.2rem;">${location.city}, ${location.state}</div>
            </div>
        `;

        if (parameters.surfaceTemp !== null) {
            html += `
                <div class="forecast-item">
                    <label>Surface Temperature</label>
                    <div class="value">${parameters.surfaceTemp.toFixed(1)}°F</div>
                </div>
            `;
        }

        if (parameters.temp850 !== null) {
            html += `
                <div class="forecast-item">
                    <label>850mb Temperature</label>
                    <div class="value">${parameters.temp850.toFixed(1)}°F</div>
                </div>
            `;
        }

        if (parameters.thickness !== null) {
            html += `
                <div class="forecast-item">
                    <label>1000-500mb Thickness</label>
                    <div class="value">${parameters.thickness} dam</div>
                </div>
            `;
        }

        if (parameters.relativeHumidity !== null) {
            html += `
                <div class="forecast-item">
                    <label>Relative Humidity</label>
                    <div class="value">${parameters.relativeHumidity}%</div>
                </div>
            `;
        }

        html += `
            <div class="forecast-item">
                <label>Liquid Precipitation</label>
                <div class="value">${parameters.liquidPrecip.toFixed(2)} in</div>
            </div>
        `;

        if (parameters.elevation > 0) {
            html += `
                <div class="forecast-item">
                    <label>Elevation</label>
                    <div class="value">${Math.round(parameters.elevation)} ft</div>
                </div>
            `;
        }

        if (forecast) {
            html += `
                <div class="forecast-item" style="grid-column: 1 / -1;">
                    <label>${forecast.name} Forecast</label>
                    <div class="value" style="font-size: 1rem; font-weight: 500;">
                        ${forecast.shortForecast}
                    </div>
                </div>
            `;
        }

        summaryElement.innerHTML = html;
        weatherSection.style.display = 'block';
    }

    /**
     * Run all snow forecasting algorithms
     */
    runAlgorithms(parameters) {
        console.log('Running snow algorithms with parameters:', parameters);

        // Run all algorithms
        const results = SnowAlgorithms.runAllAlgorithms(parameters);
        this.algorithmResults = results;

        // Display results
        this.displayAlgorithmResults(results);
    }

    /**
     * Display algorithm results
     */
    displayAlgorithmResults(results) {
        const resultsSection = document.getElementById('algorithm-results');
        const gridElement = document.getElementById('algorithm-grid');

        if (!resultsSection || !gridElement) return;

        let html = '';

        for (const result of results) {
            const confidenceBadge = `<span class="confidence-badge confidence-${result.confidence}">${result.confidence} confidence</span>`;

            html += `
                <div class="algorithm-result">
                    <h3>${result.name}</h3>
                    <div class="ratio">${result.ratio}:1</div>
                    <div class="snowfall">
                        ${result.snowfall.toFixed(2)}" snow
                    </div>
                    <div class="details">
                        <p><strong>Description:</strong> ${result.description}</p>
                        <p><strong>Notes:</strong> ${result.details}</p>
                        <p>${confidenceBadge}</p>
                    </div>
                </div>
            `;
        }

        gridElement.innerHTML = html;
        resultsSection.style.display = 'block';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Hide results
     */
    hideResults() {
        const weatherSection = document.getElementById('weather-data');
        const resultsSection = document.getElementById('algorithm-results');

        if (weatherSection) weatherSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
    }

    /**
     * Update URL with current location
     */
    updateURL(lat, lon) {
        const url = new URL(window.location);
        url.searchParams.set('lat', lat.toFixed(4));
        url.searchParams.set('lon', lon.toFixed(4));
        window.history.pushState({}, '', url);
    }

    /**
     * Export results as JSON
     */
    exportResults() {
        if (!this.algorithmResults || !this.currentWeatherData) {
            alert('No results to export. Please select a location first.');
            return;
        }

        const exportData = {
            location: this.currentWeatherData.location,
            parameters: this.currentWeatherData.parameters,
            timestamp: new Date().toISOString(),
            results: this.algorithmResults
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `snow-forecast-${this.currentWeatherData.location.city}-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new SnowForecastApp();
    app.initialize();

    // Make app available globally for debugging
    window.snowApp = app;
});
