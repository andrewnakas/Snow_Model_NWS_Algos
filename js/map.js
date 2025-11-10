/**
 * Map Interface using Leaflet
 * Handles interactive map for location selection
 */

class SnowForecastMap {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.marker = null;
        this.onLocationSelect = null;
    }

    /**
     * Initialize the map
     */
    initialize() {
        // Create map centered on continental US
        this.map = L.map(this.mapElementId).setView([39.8283, -98.5795], 4);

        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            minZoom: 3
        }).addTo(this.map);

        // Add click handler
        this.map.on('click', (e) => this.handleMapClick(e));

        // Add scale control
        L.control.scale({
            imperial: true,
            metric: true
        }).addTo(this.map);

        // Add custom control for instructions
        this.addInstructionsControl();
    }

    /**
     * Add instructions control to map
     */
    addInstructionsControl() {
        const InstructionsControl = L.Control.extend({
            onAdd: function() {
                const div = L.DomUtil.create('div', 'map-instructions');
                div.style.backgroundColor = 'white';
                div.style.padding = '10px';
                div.style.borderRadius = '5px';
                div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                div.style.fontSize = '14px';
                div.innerHTML = '<strong>Click anywhere on the map</strong> to get snow forecast algorithms';
                return div;
            }
        });

        const instructions = new InstructionsControl({ position: 'topright' });
        instructions.addTo(this.map);
    }

    /**
     * Handle map click event
     */
    handleMapClick(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;

        // Add or move marker
        if (this.marker) {
            this.marker.setLatLng(e.latlng);
        } else {
            this.marker = L.marker(e.latlng, {
                draggable: true
            }).addTo(this.map);

            // Add drag handler
            this.marker.on('dragend', (event) => {
                const position = event.target.getLatLng();
                this.handleLocationChange(position.lat, position.lng);
            });
        }

        // Update marker popup
        this.marker.bindPopup(`
            <strong>Selected Location</strong><br>
            Latitude: ${lat.toFixed(4)}<br>
            Longitude: ${lon.toFixed(4)}<br>
            <em>Fetching weather data...</em>
        `).openPopup();

        // Trigger location change callback
        this.handleLocationChange(lat, lon);
    }

    /**
     * Handle location change
     */
    handleLocationChange(lat, lon) {
        if (this.onLocationSelect) {
            this.onLocationSelect(lat, lon);
        }
    }

    /**
     * Update marker popup with location info
     */
    updateMarkerPopup(locationInfo) {
        if (this.marker) {
            this.marker.bindPopup(`
                <strong>${locationInfo.city}, ${locationInfo.state}</strong><br>
                Latitude: ${locationInfo.lat.toFixed(4)}<br>
                Longitude: ${locationInfo.lon.toFixed(4)}<br>
                Grid: ${locationInfo.gridId} (${locationInfo.gridX}, ${locationInfo.gridY})
            `).openPopup();
        }
    }

    /**
     * Set callback for location selection
     */
    setLocationSelectCallback(callback) {
        this.onLocationSelect = callback;
    }

    /**
     * Get current marker position
     */
    getMarkerPosition() {
        if (this.marker) {
            const pos = this.marker.getLatLng();
            return { lat: pos.lat, lon: pos.lng };
        }
        return null;
    }

    /**
     * Set marker at specific location
     */
    setMarker(lat, lon) {
        const latlng = L.latLng(lat, lon);

        if (this.marker) {
            this.marker.setLatLng(latlng);
        } else {
            this.marker = L.marker(latlng, {
                draggable: true
            }).addTo(this.map);

            this.marker.on('dragend', (event) => {
                const position = event.target.getLatLng();
                this.handleLocationChange(position.lat, position.lng);
            });
        }

        this.map.setView(latlng, 8);
        this.handleLocationChange(lat, lon);
    }

    /**
     * Add weather layer overlay (optional enhancement)
     */
    addWeatherLayer(layerType) {
        // Could add precipitation, temperature, or other overlays
        // This is a placeholder for future enhancement
        console.log(`Adding weather layer: ${layerType}`);
    }

    /**
     * Fly to specific coordinates
     */
    flyTo(lat, lon, zoom = 8) {
        this.map.flyTo([lat, lon], zoom);
    }

    /**
     * Get map bounds
     */
    getBounds() {
        return this.map.getBounds();
    }
}

// Make available globally
window.SnowForecastMap = SnowForecastMap;
