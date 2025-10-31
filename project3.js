document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded!");

    const margin = { top: 20, right: 220, bottom: 60, left: 70 };
    const width = 1300 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const gMain = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Static layers
    const gGrid = gMain.append("g").attr("class", "grid");
    const gAxes = gMain.append("g").attr("class", "axes");
    const gData = gMain.append("g").attr("class", "data");
    const gLegend = gMain.append("g").attr("class", "legend");

    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    let allData = [];
    let allCountries = [];
    let visibleCountries = new Set();

    // Filter country names to make them valid CSS selectors
    function sanitizeSelector(str) {
        return str.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    }

    // Update legend styles dynamically based on visible countries
    function refreshLegendStyles() {
        gLegend.selectAll(".legend-item").each(function(d, i) {
            const country = allCountries[i];
            const active = visibleCountries.has(country);
            const item = d3.select(this);

            // Update color box opacity
            item.select("div") // first child = color box
                .style("opacity", active ? 0.8 : 0.2);

            // Update text color
            item.select("div:nth-child(2)") // second child = country name
                .style("color", active ? "#2c3e50" : "#bdc3c7");
        });
    }

    // Plot properties
    function updateChart() {
        console.log("updateChart called, visible countries:", visibleCountries.size);

        // Clear only the data layer
        gData.selectAll("*").remove();

        const showChart = visibleCountries.size > 0;

        if (!showChart) {
            // Show message when no countries selected
            gData.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "18px")
                .style("fill", "#95a5a6")
                .text("Click legend to select countries");
            refreshLegendStyles();
            return;
        }

        // Filter data for visible countries
        const filteredData = allData.filter(d => visibleCountries.has(d.Country));
        const grouped = d3.group(filteredData, d => d.Country);

        // Create scales
        const x = d3.scaleLinear()
            .domain(d3.extent(allData, d => d.Year))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(allData, d => d.Value) * 1.2,
                d3.max(allData, d => d.Value) * 1.2
            ])
            .range([height, 0]);

        // Color scale
        const color = d3.scaleOrdinal()
            .domain(allCountries)
            .range(d3.schemeTableau10);

        // Grid lines 
        if (gGrid.selectAll("*").empty()) {
            gGrid.append("g")
                .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
        }

        // Axes 
        if (gAxes.selectAll("*").empty()) {
            // X axis
            gAxes.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.format("d")))
                .selectAll("text")
                .style("font-size", "12px");

            gAxes.append("text")
                .attr("class", "axis-label")
                .attr("x", width / 2)
                .attr("y", height + 45)
                .attr("text-anchor", "middle")
                .text("Year");

            // Y axis
            gAxes.append("g").call(d3.axisLeft(y));

            gAxes.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("text-anchor", "middle")
                .text("Temperature Change (°C)");

            // Reference line at 0°C
            gAxes.append("line")
                .attr("class", "reference-line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", y(0))
                .attr("y2", y(0));

            gAxes.append("text")
                .attr("x", width - 5)
                .attr("y", y(0) - 5)
                .attr("text-anchor", "end")
                .style("font-size", "11px")
                .style("fill", "#95a5a6")
                .text("0°C");
        }

        // Line generator
        const line = d3.line()
            .x(d => x(d.Year))
            .y(d => y(d.Value))
            .curve(d3.curveMonotoneX);

        // Draw lines and points for each visible country
        grouped.forEach((values, country) => {
            const safeClass = sanitizeSelector(country);

            // Line
            gData.append("path")
                .datum(values)
                .attr("class", "line")
                .attr("id", `line-${safeClass}`)
                .attr("d", line)
                .attr("stroke", color(country))
                .attr("opacity", 0.7)
                .attr("fill", "none");

            // Interactive circles
            gData.selectAll(`.dot-${safeClass}`)
                .data(values)
                .enter()
                .append("circle")
                .attr("class", `dot-${safeClass}`)
                .attr("cx", d => x(d.Year))
                .attr("cy", d => y(d.Value))
                .attr("r", 3)
                .attr("fill", color(country))
                .attr("stroke", "white")
                .attr("stroke-width", 1.0)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    gData.selectAll(".line").attr("opacity", 0.2);
                    gData.select(`#line-${safeClass}`).attr("opacity", 1);

                    d3.select(this)
                        .transition().duration(200)
                        .attr("r", 6);

                    const tempClass = d.Value >= 0 ? 'warming' : 'cooling';
                    const tempText = d.Value >= 0 ? 'warming' : 'cooling';

                    tooltip
                        .style("opacity", 1)
                        .html(`
                            <strong>${country}</strong><br/>
                            Year: ${d.Year}<br/>
                            Temperature Change: <span class="${tempClass}">${d.Value > 0 ? '+' : ''}${d.Value.toFixed(3)}°C</span><br/>
                            <em>(${tempText})</em>
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function() {
                    gData.selectAll(".line").attr("opacity", 0.7);
                    d3.select(this)
                        .transition().duration(200)
                        .attr("r", 3);
                    tooltip.style("opacity", 0);
                });
        });

        // Build legend once
        if (gLegend.selectAll("*").empty()) {
            const legendContainer = gLegend.append("foreignObject")
                .attr("x", width + 20)
                .attr("y", 0)
                .attr("width", 180)
                .attr("height", height);

            const legendDiv = legendContainer.append("xhtml:div")
                .attr("class", "legend-scroll-container")
                .style("height", height + "px");

            // Legend title
            legendDiv.append("div")
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .style("color", "#2c3e50")
                .style("margin-bottom", "10px")
                .style("position", "sticky")
                .style("top", "0")
                .style("background", "white")
                .style("padding", "5px 0")
                .style("z-index", "10")
                .text("Countries (click to select)");

            // Add legend items
            allCountries.forEach((country, i) => {
                const legendItem = legendDiv.append("div")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("margin-bottom", "8px")
                    .style("cursor", "pointer")
                    .style("padding", "4px")
                    .style("border-radius", "4px")
                    .style("transition", "background 0.2s")
                    .attr("class", "legend-item")
                    .on("click", function() {
                        // Toggle country visibility
                        if (visibleCountries.has(country)) {
                            visibleCountries.delete(country);
                        } else {
                            visibleCountries.add(country);
                        }
                        refreshLegendStyles(); // update legend opacity/color
                        updateChart(); // redraw chart
                    })
                    .on("mouseenter", function() { d3.select(this).style("background", "#f0f0f0"); })
                    .on("mouseleave", function() { d3.select(this).style("background", "transparent"); });

                // Color box
                legendItem.append("div")
                    .style("width", "16px")
                    .style("height", "16px")
                    .style("background", color(country))
                    .style("margin-right", "8px")
                    .style("border-radius", "2px");

                // Country name
                legendItem.append("div")
                    .style("font-size", "11px")
                    .style("flex", "1")
                    .text(country);
            });

            // Initial legend styles
            refreshLegendStyles();
        } else {
            refreshLegendStyles(); // always refresh on update
        }
    }

    // Load data
    d3.json("Surface_Temp_Change.json").then(data => {
        console.log("Data loaded:", data.length, "records");

        allData = data.map(d => ({
            Country: d.Country,
            Year: +d.Year,
            Value: +d.Value
        }));

        allCountries = [...new Set(allData.map(d => d.Country))].sort();
        visibleCountries = new Set(allCountries);

        updateChart();

        // Event listeners for buttons
        d3.select("#show-all").on("click", function() {
            visibleCountries = new Set(allCountries);
            updateChart();
        });

        d3.select("#clear-all").on("click", function() {
            visibleCountries = new Set();
            updateChart();
        });

        d3.select("#top-10").on("click", function() {
            const avgByCountry = d3.rollup(
                allData,
                v => d3.mean(v, d => d.Value),
                d => d.Country
            );
            const top10 = Array.from(avgByCountry.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(d => d[0]);
            visibleCountries = new Set(top10);
            updateChart();
        });
    }).catch(error => {
        console.error("Error loading data:", error);
        alert("Error loading data: " + error.message);
    });
});
