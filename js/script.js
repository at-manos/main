async function createWeatherMap() {
  const width = 975;
  const height = 610;

  const us = await d3.json("data/states-albers-10m.json");

  let rawData = await d3.csv("data/weather.csv");

  const validStates = new Set([
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "DC",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ]);

  rawData = rawData.filter((entry) => validStates.has(entry.state));

  const stateData = new Map();
  const stateDetailedData = new Map();

  rawData.forEach((entry) => {
    const { state, TAVG, TMIN, TMAX, AWND, SNOW, PRCP, station, date } = entry;

    if (!stateData.has(state)) {
      stateData.set(state, []);
      stateDetailedData.set(state, {
        tempPoints: [],
        stationCount: new Set(),
        minTemp: Infinity,
        maxTemp: -Infinity,
        avgTemp: 0,
        totalSnow: 0,
        totalPrecip: 0,
        windSpeed: [],
      });
    }

    if (+TAVG) stateData.get(state).push(+TAVG);

    const detailedData = stateDetailedData.get(state);
    if (+TMIN) detailedData.minTemp = Math.min(detailedData.minTemp, +TMIN);
    if (+TMAX) detailedData.maxTemp = Math.max(detailedData.maxTemp, +TMAX);
    if (+TAVG) detailedData.tempPoints.push(+TAVG);
    if (station) detailedData.stationCount.add(station);
    if (+SNOW) detailedData.totalSnow += +SNOW;
    if (+PRCP) detailedData.totalPrecip += +PRCP;
    if (+AWND) detailedData.windSpeed.push(+AWND);
  });

  const fipsToState = {
    "01": "AL",
    "02": "AK",
    "04": "AZ",
    "05": "AR",
    "06": "CA",
    "08": "CO",
    "09": "CT",
    10: "DE",
    11: "DC",
    12: "FL",
    13: "GA",
    15: "HI",
    16: "ID",
    17: "IL",
    18: "IN",
    19: "IA",
    20: "KS",
    21: "KY",
    22: "LA",
    23: "ME",
    24: "MD",
    25: "MA",
    26: "MI",
    27: "MN",
    28: "MS",
    29: "MO",
    30: "MT",
    31: "NE",
    32: "NV",
    33: "NH",
    34: "NJ",
    35: "NM",
    36: "NY",
    37: "NC",
    38: "ND",
    39: "OH",
    40: "OK",
    41: "OR",
    42: "PA",
    44: "RI",
    45: "SC",
    46: "SD",
    47: "TN",
    48: "TX",
    49: "UT",
    50: "VT",
    51: "VA",
    53: "WA",
    54: "WV",
    55: "WI",
    56: "WY",
  };

  stateData.forEach((temps, state) => {
    stateData.set(state, d3.mean(temps));

    const detailedData = stateDetailedData.get(state);
    detailedData.avgTemp = d3.mean(detailedData.tempPoints);
    detailedData.avgWind = d3.mean(detailedData.windSpeed);
    detailedData.dataPointCount = detailedData.tempPoints.length;
  });

  const colorExtent = d3.extent(stateData.values());
  const colorScale = d3.scaleSequential(colorExtent, d3.interpolateCool);

  createFilterPanel(stateDetailedData);

  const svg = d3
    .select("#vis")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("style", "max-width: 100%; height: auto;");

  const path = d3.geoPath();

  const stateNames = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    DC: "District of Columbia",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
  };

  function transform(d) {
    const [x, y] = path.centroid(d);
    const stateCode = fipsToState[d.id];
    const temp = stateData.get(stateCode);
    const scale = temp ? Math.sqrt(temp) / 10 : 1;
    return `translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`;
  }

  svg
    .append("path")
    .datum(topojson.mesh(us, us.objects.states))
    .attr("fill", "none")
    .attr("stroke", "#ccc")
    .attr("d", path);

  const tooltip = d3
    .select("#tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "8px")
    .style("padding", "12px")
    .style("box-shadow", "0 4px 8px rgba(0,0,0,0.2)")
    .style("pointer-events", "none")
    .style("max-width", "300px")
    .style("font-family", "Arial, sans-serif")
    .style("font-size", "14px")
    .style("transition", "opacity 0.3s");

  function createTempGauge(min, avg, max) {
    const gaugeWidth = 220;
    const height = 60;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", gaugeWidth);
    svg.setAttribute("height", height);

    const range = max - min;
    const padding = range * 0.1;
    const scale = d3
      .scaleLinear()
      .domain([min - padding, max + padding])
      .range([0, gaugeWidth]);

    const barHeight = 8;
    const gradient = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient"
    );
    gradient.setAttribute("id", "tempGradient");
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("x2", "100%");

    const stop1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop"
    );
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "blue");

    const stop2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop"
    );
    stop2.setAttribute("offset", "50%");
    stop2.setAttribute("stop-color", "yellow");

    const stop3 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "stop"
    );
    stop3.setAttribute("offset", "100%");
    stop3.setAttribute("stop-color", "red");

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.appendChild(stop3);

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const bgRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    bgRect.setAttribute("x", 0);
    bgRect.setAttribute("y", 20);
    bgRect.setAttribute("width", gaugeWidth);
    bgRect.setAttribute("height", barHeight);
    bgRect.setAttribute("rx", 4);
    bgRect.setAttribute("ry", 4);
    bgRect.setAttribute("fill", "url(#tempGradient)");
    svg.appendChild(bgRect);

    const minText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    minText.setAttribute("x", 0);
    minText.setAttribute("y", 15);
    minText.setAttribute("fill", "blue");
    minText.setAttribute("font-size", "12px");
    minText.textContent = `${min.toFixed(1)}°F`;
    svg.appendChild(minText);

    const maxText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    maxText.setAttribute("x", gaugeWidth);
    maxText.setAttribute("y", 15);
    maxText.setAttribute("text-anchor", "end");
    maxText.setAttribute("fill", "red");
    maxText.setAttribute("font-size", "12px");
    maxText.textContent = `${max.toFixed(1)}°F`;
    svg.appendChild(maxText);

    const avgLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    const avgX = scale(avg);
    avgLine.setAttribute("x1", avgX);
    avgLine.setAttribute("y1", 15);
    avgLine.setAttribute("x2", avgX);
    avgLine.setAttribute("y2", 35);
    avgLine.setAttribute("stroke", "black");
    avgLine.setAttribute("stroke-width", 2);
    svg.appendChild(avgLine);

    const avgMarker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    avgMarker.setAttribute("cx", avgX);
    avgMarker.setAttribute("cy", 40);
    avgMarker.setAttribute("r", 6);
    avgMarker.setAttribute("fill", "black");
    svg.appendChild(avgMarker);

    const avgText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    avgText.setAttribute("x", avgX);
    avgText.setAttribute("y", 55);
    avgText.setAttribute("text-anchor", "middle");
    avgText.setAttribute("font-weight", "bold");
    avgText.setAttribute("font-size", "12px");
    avgText.textContent = `${avg.toFixed(1)}°F`;
    svg.appendChild(avgText);

    return svg;
  }

  function showTooltip(event, d) {
    const stateCode = fipsToState[d.id];
    const stateName = stateNames[stateCode];
    const details = stateDetailedData.get(stateCode);
    const avgTemp = stateData.get(stateCode);

    if (!details) return;

    tooltip.style("visibility", "visible").style("opacity", 1);

    tooltip
      .html("")
      .append("div")
      .style("background-color", colorScale(avgTemp))
      .style(
        "color",
        avgTemp > (colorExtent[0] + colorExtent[1]) / 2 ? "black" : "white"
      )
      .style("padding", "8px")
      .style("margin", "-12px -12px 10px -12px")
      .style("border-radius", "8px 8px 0 0")
      .style("font-weight", "bold")
      .style("font-size", "16px")
      .text(stateName);

    const content = tooltip.append("div");

    const gaugeContainer = content.append("div").style("margin-bottom", "12px");

    gaugeContainer
      .node()
      .appendChild(
        createTempGauge(details.minTemp, details.avgTemp, details.maxTemp)
      );

    content
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "6px").html(`
        <div style="font-weight: bold; margin-right: 8px;">Data Points:</div>
        <div style="background: ${colorScale(
          avgTemp
        )}; color: white; padding: 2px 8px; 
             border-radius: 10px; display: inline-block; animation: pulse 1.5s infinite">
          ${details.dataPointCount}
        </div>
      `);

    content
      .append("div")
      .style("display", "grid")
      .style("grid-template-columns", "1fr 1fr")
      .style("gap", "6px").html(`
        <div><strong>Weather Stations:</strong> ${
          details.stationCount.size
        }</div>
        <div><strong>Wind Speed:</strong> ${
          details.avgWind ? details.avgWind.toFixed(1) + " mph" : "N/A"
        }</div>
        <div><strong>Total Snow:</strong> ${details.totalSnow.toFixed(
          1
        )} mm</div>
        <div><strong>Total Precip:</strong> ${details.totalPrecip.toFixed(
          1
        )} mm</div>
      `);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);

    tooltip
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 28 + "px");
  }

  function moveTooltip(event) {
    tooltip
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 28 + "px");
  }
  function hideTooltip() {
    tooltip.style("opacity", 0).style("visibility", "hidden");
  }

  function updateMap(filteredStates) {
    svg.selectAll(".state").remove();

    const state = svg
      .append("g")
      .attr("stroke", "#000")
      .selectAll("path")
      .data(
        topojson.feature(us, us.objects.states).features.filter((d) => {
          const stateCode = fipsToState[d.id];
          return filteredStates.has(stateCode);
        })
      )
      .join("path")
      .attr("class", "state")
      .attr("vector-effect", "non-scaling-stroke")
      .attr("d", path)
      .attr("fill", (d) => colorScale(stateData.get(fipsToState[d.id])))
      .attr("transform", (d) => transform(d))
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 2)
          .attr("stroke", "#333");

        showTooltip(event, d);
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 1)
          .attr("stroke", "#000");

        hideTooltip();
      })
      .on("mousemove", moveTooltip);

    d3.select("#stateCount").text(filteredStates.size);
  }

  const legendWidth = 260;
  const legendHeight = 50;
  updateMap(new Set(Object.values(fipsToState)));

  const legendContainer = d3
    .select("#vis")
    .append("div")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("margin-top", "30px")
    .style("margin-bottom", "20px");

  const legendSvg = legendContainer
    .append("svg")
    .attr("width", legendWidth)
    .attr("height", legendHeight);

  const legendScale = d3.scaleSequential(colorExtent, d3.interpolateCool);

  const defs = legendSvg.append("defs");

  const gradient = defs
    .append("linearGradient")
    .attr("id", "temperature-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  const stops = d3.range(0, 1.1, 0.1);
  stops.forEach((stop) => {
    gradient
      .append("stop")
      .attr("offset", `${stop * 100}%`)
      .attr(
        "stop-color",
        legendScale(d3.interpolate(colorExtent[0], colorExtent[1])(stop))
      );
  });

  const barWidth = legendWidth - 80;

  const legendXScale = d3
    .scaleLinear()
    .domain(colorExtent)
    .range([40, 40 + barWidth]);

  const legendAxis = d3
    .axisBottom(legendXScale)
    .ticks(3) 
    .tickFormat((d) => `${d.toFixed(1)}°F`);
  legendSvg
    .append("rect")
    .attr("x", 40)
    .attr("y", 0)
    .attr("width", barWidth)
    .attr("height", 15)
    .style("fill", "url(#temperature-gradient)");

  legendSvg.append("g").attr("transform", `translate(0, 15)`).call(legendAxis);

  legendSvg
    .append("text")
    .attr("x", legendWidth / 2)
    .attr("y", legendHeight - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Average Temperature (°F)");

  function createFilterPanel(stateData) {
    const filterContainer = d3
      .select(".container")
      .insert("div", "#vis")
      .attr("id", "filter-panel")
      .style("margin-bottom", "20px")
      .style("padding", "15px")
      .style("background-color", "#f7f7f7")
      .style("border-radius", "8px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    filterContainer
      .append("h3")
      .style("margin-top", "0")
      .style("margin-bottom", "15px")
      .text("Filter States");

    const filterRow = filterContainer
      .append("div")
      .style("display", "flex")
      .style("flex-wrap", "wrap")
      .style("gap", "10px")
      .style("margin-bottom", "15px");

    function createFilterGroup(id, label, min, max, step, defaultValue) {
      const group = filterRow
        .append("div")
        .style("flex", "1")
        .style("min-width", "200px")
        .style("padding", "10px")
        .style("background-color", "white")
        .style("border-radius", "6px")
        .style("box-shadow", "0 1px 3px rgba(0,0,0,0.1)");

      group
        .append("label")
        .attr("for", id)
        .style("display", "block")
        .style("margin-bottom", "5px")
        .style("font-weight", "bold")
        .text(label);

      const rangeContainer = group
        .append("div")
        .style("display", "flex")
        .style("align-items", "center");

      const valueDisplay = group
        .append("div")
        .attr("class", "value-display")
        .style("font-size", "14px")
        .style("margin-top", "5px")
        .style("color", "#666");

      const slider = rangeContainer
        .append("input")
        .attr("type", "range")
        .attr("id", id)
        .attr("min", min)
        .attr("max", max)
        .attr("step", step)
        .attr("value", defaultValue)
        .style("flex", "1")
        .style("margin-right", "10px");

      valueDisplay.text(`${defaultValue}${id.includes("temp") ? "°F" : ""}`);

      slider.on("input", function () {
        valueDisplay.text(`${this.value}${id.includes("temp") ? "°F" : ""}`);
        applyFilters();
      });

      return slider;
    }

    const tempValues = Array.from(stateData.values())
      .map((d) => d.avgTemp)
      .filter((v) => !isNaN(v));
    const minTemp = Math.floor(d3.min(tempValues));
    const maxTemp = Math.ceil(d3.max(tempValues));

    const dataPoints = Array.from(stateData.values()).map(
      (d) => d.dataPointCount
    );
    const maxDataPoints = d3.max(dataPoints);

    const stationCounts = Array.from(stateData.values()).map(
      (d) => d.stationCount.size
    );
    const maxStations = d3.max(stationCounts);

    const snowValues = Array.from(stateData.values()).map((d) => d.totalSnow);
    const maxSnow = d3.max(snowValues);

    const minTempSlider = createFilterGroup(
      "min-temp",
      "Min Temperature (°F)",
      minTemp,
      maxTemp,
      0.5,
      minTemp
    );
    const dataPointsSlider = createFilterGroup(
      "min-data-points",
      "Min Data Points",
      0,
      maxDataPoints,
      10,
      0
    );
    const stationsSlider = createFilterGroup(
      "min-stations",
      "Min Weather Stations",
      0,
      maxStations,
      1,
      0
    );
    const snowSlider = createFilterGroup(
      "min-snow",
      "Min Total Snow (mm)",
      0,
      maxSnow,
      10,
      0
    );

    const buttonRow = filterContainer
      .append("div")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("align-items", "center");

    buttonRow
      .append("div")
      .html(
        `Showing <span id="stateCount">${
          Object.keys(stateData).length
        }</span> states`
      );

    const resetButton = buttonRow
      .append("button")
      .text("Reset Filters")
      .style("background-color", "#4a86e8")
      .style("color", "white")
      .style("border", "none")
      .style("padding", "8px 16px")
      .style("border-radius", "4px")
      .style("cursor", "pointer")
      .style("font-weight", "bold");

    resetButton.on("click", function () {
      minTempSlider.property("value", minTemp);
      dataPointsSlider.property("value", 0);
      stationsSlider.property("value", 0);
      snowSlider.property("value", 0);

      d3.select("#min-temp").each(function () {
        d3.select(this.parentNode.parentNode)
          .select(".value-display")
          .text(`${minTemp}°F`);
      });

      d3.select("#min-data-points").each(function () {
        d3.select(this.parentNode.parentNode)
          .select(".value-display")
          .text("0");
      });

      d3.select("#min-stations").each(function () {
        d3.select(this.parentNode.parentNode)
          .select(".value-display")
          .text("0");
      });

      d3.select("#min-snow").each(function () {
        d3.select(this.parentNode.parentNode)
          .select(".value-display")
          .text("0");
      });

      applyFilters();
    });

    function applyFilters() {
      const minTemp = +minTempSlider.property("value");
      const minDataPoints = +dataPointsSlider.property("value");
      const minStations = +stationsSlider.property("value");
      const minSnow = +snowSlider.property("value");

      const filteredStates = new Set();

      stateData.forEach((data, stateCode) => {
        if (
          data.avgTemp >= minTemp &&
          data.dataPointCount >= minDataPoints &&
          data.stationCount.size >= minStations &&
          data.totalSnow >= minSnow
        ) {
          filteredStates.add(stateCode);
        }
      });

      updateMap(filteredStates);
    }
  }
}

createWeatherMap();
