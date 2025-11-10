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
        let index = 0;

        for (const result of results) {
            const confidenceBadge = `<span class="confidence-badge confidence-${result.confidence}">${result.confidence} confidence</span>`;

            html += `
                <div class="algorithm-result" data-algorithm="${result.name}" data-index="${index}">
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
            index++;
        }

        gridElement.innerHTML = html;
        resultsSection.style.display = 'block';

        // Add click handlers to algorithm cards
        const algorithmCards = document.querySelectorAll('.algorithm-result');
        algorithmCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const algorithmName = card.dataset.algorithm;
                this.showAlgorithmDetails(algorithmName);
            });
        });

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
     * Show algorithm details in modal with charts
     */
    showAlgorithmDetails(algorithmName) {
        if (!this.currentWeatherData || !this.currentWeatherData.hourlyData) {
            alert('No hourly data available');
            return;
        }

        const hourlyData = this.currentWeatherData.hourlyData;
        const elevation = this.currentWeatherData.parameters.elevation;

        // Calculate hourly forecast for this algorithm
        const hourlyForecast = SnowAlgorithms.calculateHourlyForecast(
            algorithmName,
            hourlyData,
            elevation
        );

        // Show modal
        this.showModal(algorithmName, hourlyForecast);
    }

    /**
     * Show modal with charts
     */
    showModal(algorithmName, hourlyForecast) {
        const modal = document.getElementById('chartModal');
        const modalTitle = document.getElementById('modalTitle');

        modalTitle.textContent = `${algorithmName} - Hourly Forecast`;
        modal.classList.add('show');

        // Setup modal close handlers
        const closeBtn = document.querySelector('.modal-close');
        closeBtn.onclick = () => this.closeModal();

        window.onclick = (event) => {
            if (event.target === modal) {
                this.closeModal();
            }
        };

        // Create charts
        this.createCharts(hourlyForecast);

        // Display totals
        this.displayTotals(hourlyForecast.totals);
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('chartModal');
        modal.classList.remove('show');

        // Destroy existing charts
        if (this.charts) {
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.destroy();
            });
            this.charts = {};
        }
    }

    /**
     * Create charts
     */
    createCharts(hourlyForecast) {
        if (!this.charts) this.charts = {};

        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        const hourly = hourlyForecast.hourly;

        // Prepare labels (time)
        const labels = hourly.map(h => {
            const date = new Date(h.time);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                hour12: true
            });
        });

        // Snowfall Accumulation Chart
        this.charts.snowfall = new Chart(
            document.getElementById('snowfallChart'),
            {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Cumulative Snowfall (inches)',
                            data: hourly.map(h => h.cumulativeSnowfall),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Hourly Snowfall (inches)',
                            data: hourly.map(h => h.snowfall),
                            borderColor: '#60a5fa',
                            backgroundColor: 'rgba(96, 165, 250, 0.5)',
                            type: 'bar',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Snowfall Accumulation',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Cumulative (inches)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Hourly (inches)'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            }
        );

        // SLR Chart
        this.charts.slr = new Chart(
            document.getElementById('slrChart'),
            {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Snow-to-Liquid Ratio',
                        data: hourly.map(h => h.ratio),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Snow-to-Liquid Ratio Over Time',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: 'Ratio (X:1)'
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            }
        );

        // Temperature Chart
        this.charts.temp = new Chart(
            document.getElementById('tempChart'),
            {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Temperature (°F)',
                            data: hourly.map(h => h.temperature),
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Relative Humidity (%)',
                            data: hourly.map(h => h.relativeHumidity),
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Temperature & Humidity',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Temperature (°F)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Humidity (%)'
                            },
                            min: 0,
                            max: 100,
                            grid: {
                                drawOnChartArea: false
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            }
        );

        // Precipitation Chart
        this.charts.precip = new Chart(
            document.getElementById('precipChart'),
            {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Liquid Precipitation (inches)',
                            data: hourly.map(h => h.liquidPrecip),
                            backgroundColor: 'rgba(59, 130, 246, 0.6)',
                            borderColor: '#3b82f6',
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Precipitation Probability (%)',
                            data: hourly.map(h => h.precipProbability),
                            type: 'line',
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Precipitation Forecast',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Liquid (inches)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Probability (%)'
                            },
                            min: 0,
                            max: 100,
                            grid: {
                                drawOnChartArea: false
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            }
        );
    }

    /**
     * Display forecast totals
     */
    displayTotals(totals) {
        const totalStats = document.getElementById('totalStats');

        const html = `
            <h3>Forecast Totals (${totals.duration} hours / ${(totals.duration / 24).toFixed(1)} days)</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <label>Total Snowfall</label>
                    <div class="stat-value">${totals.snowfall.toFixed(2)}"</div>
                </div>
                <div class="stat-item">
                    <label>Total Liquid</label>
                    <div class="stat-value">${totals.liquid.toFixed(2)}"</div>
                </div>
                <div class="stat-item">
                    <label>Average Ratio</label>
                    <div class="stat-value">${totals.averageRatio.toFixed(1)}:1</div>
                </div>
                <div class="stat-item">
                    <label>Snow Water Equivalent</label>
                    <div class="stat-value">${totals.liquid > 0 ? ((totals.liquid / totals.snowfall) * 100).toFixed(1) : 0}%</div>
                </div>
            </div>
        `;

        totalStats.innerHTML = html;
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
