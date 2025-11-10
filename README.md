# NOAA Snow Forecast Algorithms

An interactive web application that implements and compares multiple snow forecasting methodologies used by the National Weather Service (NWS) and Weather Prediction Center (WPC).

## Live Demo

Visit the live application: [https://andrewnakas.github.io/Snow_Model_NWS_Algos/](https://andrewnakas.github.io/Snow_Model_NWS_Algos/)

## Features

- **Interactive Map**: Click anywhere on the map to get snow forecasts for that location
- **Real-time Weather Data**: Fetches current and forecast data from the NWS API
- **Extended Forecast Range**: 156 hours (6.5 days) of hourly predictions
- **Elevation-Based Corrections**: Automatically adjusts forecasts for actual terrain elevation
- **7 Snow Forecasting Algorithms**:
  - Simple 10:1 Ratio (baseline)
  - Thickness Method (1000-500mb)
  - Simple Temperature Method
  - Dendritic Growth Zone Method
  - Cobb-Waldstreicher Method
  - Byun et al. Method
  - Relative Humidity Adjusted Method
- **Interactive Hourly Charts**: Click any algorithm to see detailed hourly breakdowns with 4 comprehensive charts
- **Atmospheric Corrections**: Lapse rate and orographic adjustments for mountain locations
- **Side-by-side Comparison**: Compare all algorithms for the same location and conditions
- **Confidence Ratings**: Each algorithm provides a confidence level for its prediction
- **Responsive Design**: Works on desktop and mobile devices

## Algorithms Implemented

### 1. Simple 10:1 Ratio
Classic baseline method assuming 10 inches of snow equals 1 inch of liquid precipitation. Used as a simple reference point.

### 2. Thickness Method
Uses 1000-500mb atmospheric thickness to determine precipitation type and snow-to-liquid ratios. The 540 decameter line traditionally separates rain from snow. Includes elevation adjustments.

**Reference**: Standard NWS operational method

### 3. Simple Temperature Method
Calculates SLR based on surface temperature, with peak ratios in the -12°C to -18°C range where dendrite formation is optimal.

### 4. Dendritic Growth Zone Method
Optimized for the -12°C to -18°C temperature range (10°F to -1°F) where dendrite snow crystals form, producing the highest snow-to-liquid ratios. This is often called the "snow production zone."

**Reference**: Based on crystal habit research and operational experience

### 5. Cobb-Waldstreicher Method
Advanced layer-weighted approach considering temperature, vertical motion, and humidity throughout the atmospheric column. Widely used at NWS offices.

**Reference**: Cobb and Waldstreicher (2005)

### 6. Byun et al. Method
Calculates SLR as a function of both surface temperature and precipitation rate, accounting for the relationship between snowfall intensity and crystal structure.

**Formula**: SLR = 18.0 - 0.5×T - 1.5×PR (where T is in °C and PR is in mm/hr)

**Reference**: Byun et al. (2008)

### 7. Relative Humidity Adjusted Method
Modifies temperature-based ratios using relative humidity to account for crystal riming and aggregation processes. High humidity can cause riming, reducing ratios, while low humidity increases ratios.

## Technical Details

### Atmospheric Corrections

The application automatically applies elevation-based atmospheric corrections for accurate forecasts:

- **Elevation Detection**: Uses Open-Elevation API to determine actual terrain elevation at clicked point
- **Temperature Lapse Rate**: Adjusts temperature using standard atmospheric lapse rates (5.5°F per 1000 ft for dry air, 3.3°F per 1000 ft for moist air)
- **Pressure Altitude**: Calculates correct atmospheric pressure at target elevation
- **Layer Temperatures**: Adjusts 850mb and 700mb temperatures based on elevation
- **Thickness Adjustment**: Recalculates 1000-500mb thickness for target elevation
- **Orographic Enhancement**: Accounts for precipitation increase in mountain locations (10% per 1000 ft elevation gain)
- **Humidity Adjustment**: Modifies relative humidity for elevation changes

**When corrections apply**: Automatically triggered when clicked elevation differs from NWS grid point by more than 100 feet. Orange indicators show corrected values.

### Hourly Forecast Charts

Click on any algorithm card to view detailed hourly forecasts with interactive charts:

1. **Snowfall Accumulation**: Cumulative snowfall (line) and hourly snowfall (bars)
2. **Snow-to-Liquid Ratio**: How SLR varies hour-by-hour based on changing conditions
3. **Temperature & Humidity**: Dual-axis chart showing temperature and relative humidity trends
4. **Precipitation**: Liquid precipitation amounts with probability overlay

Each chart displays the full 156-hour forecast period with:
- Total snowfall accumulation
- Total liquid precipitation
- Average SLR across forecast period
- Snow Water Equivalent (SWE) percentage

### Data Sources

- **Weather Data**: National Weather Service API (api.weather.gov)
- **Elevation Data**: Open-Elevation API (api.open-elevation.com)
- **Map Tiles**: OpenStreetMap
- **Coverage**: Continental United States, Alaska, Hawaii, Puerto Rico, and Guam

### Technologies Used

- **Frontend**: Vanilla JavaScript (ES6+)
- **Mapping**: Leaflet.js
- **Charts**: Chart.js 4.4
- **Styling**: CSS3 with CSS Grid and Flexbox
- **APIs**: NWS API v1, Open-Elevation API
- **Deployment**: GitHub Pages with GitHub Actions

### Project Structure

```
Snow_Model_NWS_Algos/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Application styling with modal support
├── js/
│   ├── atmospheric.js      # Atmospheric corrections and lapse rates
│   ├── algorithms.js       # Snow forecasting algorithms + hourly calculations
│   ├── nws-api.js         # NWS API integration + elevation fetching
│   ├── map.js             # Leaflet map interface
│   └── app.js             # Main application logic + chart rendering
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions deployment
└── README.md              # This file
```

## Usage

1. **Select a Location**: Click anywhere on the map to select a location
2. **View Weather Data**: The app fetches current weather conditions and forecast data
   - Automatically detects elevation at clicked point
   - Applies atmospheric corrections if elevation differs from NWS grid
   - Shows adjusted temperatures and parameters with orange indicators
3. **Compare Algorithms**: All algorithms run automatically with corrected data
4. **View Hourly Forecasts**: Click any algorithm card to see:
   - Cumulative snowfall accumulation chart
   - Hour-by-hour snow-to-liquid ratio changes
   - Temperature and humidity trends
   - Precipitation timing and amounts
   - Total forecast statistics (156 hours / 6.5 days)
5. **Interpret Results**:
   - **Ratio**: The snow-to-liquid ratio (e.g., 15:1 means 15" snow per 1" liquid)
   - **Snowfall**: Predicted snow accumulation based on forecast liquid precipitation
   - **Confidence**: High, medium, or low confidence in the prediction
   - **Elevation Corrections**: Orange labels indicate elevation-adjusted parameters

## Development

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/andrewnakas/Snow_Model_NWS_Algos.git
   cd Snow_Model_NWS_Algos
   ```

2. Serve locally (any simple HTTP server works):
   ```bash
   python -m http.server 8000
   # or
   npx http-server
   ```

3. Open http://localhost:8000 in your browser

### Deployment

The application automatically deploys to GitHub Pages when changes are pushed to the main branch or the designated Claude branch. The GitHub Actions workflow handles the build and deployment.

## Limitations and Caveats

1. **Simplified Implementations**: Some algorithms (especially Cobb-Waldstreicher) are simplified versions as full implementation would require complete atmospheric sounding data
2. **Estimated Parameters**: Some atmospheric parameters (850mb temp, 700mb temp, thickness) are estimated from surface data when not directly available from the NWS API
3. **Coverage**: Limited to areas covered by the NWS API (continental US, Alaska, Hawaii, territories)
4. **Precipitation Forecast**: The app uses NWS quantitative precipitation forecasts which may have uncertainty
5. **Model Data**: The NWS API provides model data that may differ from observed conditions

## References

### Academic Papers
- Cobb, M. D., and J. S. Waldstreicher, 2005: A simple physically based snowfall algorithm. *21st Conference on Weather Analysis and Forecasting*
- Byun, K.-Y., et al., 2008: A snow-ratio equation and its application to numerical snowfall prediction. *Weather and Forecasting*, 23, 644-658
- Roebber, P. J., et al., 2003: Improving snowfall forecasting by diagnosing snow density. *Weather and Forecasting*, 18, 264-287

### NOAA/NWS Resources
- [NOAA Weather Prediction Center Snow Research](https://www.wpc.ncep.noaa.gov/research/snowfcst/snow.pdf)
- [NWS API Documentation](https://www.weather.gov/documentation/services-web-api)
- [WPC Winter Weather Forecasting](https://www.wpc.ncep.noaa.gov/research/snow2a/snow2a.pdf)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- National Weather Service for providing free API access to weather data
- NOAA Weather Prediction Center for snow forecasting research and methodologies
- OpenStreetMap contributors for map tiles
- Leaflet.js for the mapping library

## Contact

For questions or issues, please open an issue on GitHub.

---

**Disclaimer**: This application is for educational and research purposes. Always consult official National Weather Service forecasts for actual weather decision-making.
