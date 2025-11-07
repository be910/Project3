const margin = { top: 50, right: 20, bottom: 60, left: 70 };
const width = 1500 - margin.left - margin.right;
const height = 800 - margin.top - margin.bottom;

const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const color = d3.scaleOrdinal(d3.schemeTableau10);

let allData, continentData;
let xScale, yScale, line;
let allVisible = true; // For the select/deselect all toggle

d3.json("Surface_Temp_Change.json").then(data => {
  data.forEach(d => {
    d.Year = +d.Year;
    d.Value = +d.Value;
  });

  allData = data;

  // Aggregate by continent
  continentData = Array.from(
    d3.rollup(
      data,
      v => d3.mean(v, d => d.Value),
      d => d.Continent,
      d => d.Year
    ),
    ([Continent, yearMap]) => ({
      Continent,
      values: Array.from(yearMap, ([Year, Value]) => ({ Year, Value })).sort((a, b) => a.Year - b.Year)
    })
  );

  drawChart(continentData, "continent");
});

function drawChart(data, type, continentName) {
  svg.selectAll("*").remove();
  d3.select("#legend").selectAll("*").remove();

  const allYears = [...new Set(allData.map(d => d.Year))];

  xScale = d3.scaleLinear()
    .domain(d3.extent(allYears))
    .range([0, width]);

  yScale = d3.scaleLinear()
    .domain([
      d3.min(data, g => d3.min(g.values, d => d.Value)),
      d3.max(data, g => d3.max(g.values, d => d.Value))
    ])
    .nice()
    .range([height, 0]);

  line = d3.line()
    .x(d => xScale(d.Year))
    .y(d => yScale(d.Value));

  // Grid lines
  const xAxisGrid = d3.axisBottom(xScale)
    .tickSize(-height)
    .tickFormat('');
  const yAxisGrid = d3.axisLeft(yScale)
    .tickSize(-width)
    .tickFormat('');

  svg.append('g')
    .attr('class', 'x grid')
    .attr('transform', `translate(0,${height})`)
    .call(xAxisGrid)
    .selectAll('line')
    .attr('stroke', '#ddd')
    .attr('stroke-opacity', 0.5);

  svg.append('g')
    .attr('class', 'y grid')
    .call(yAxisGrid)
    .selectAll('line')
    .attr('stroke', '#ddd')
    .attr('stroke-opacity', 0.5);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
    .attr("font-size", "14px");

  svg.append("g")
    .call(d3.axisLeft(yScale))
    .attr("font-size", "14px");

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("°C");

  // Lines
  svg.selectAll(".line")
    .data(data)
    .join("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", d => color(d[type === "continent" ? "Continent" : "Country"]))
    .attr("stroke-width", 2)
    .attr("d", d => line(d.values));

  // Scrollable legend
  const legend = d3.select("#legend")
    .selectAll(".legend")
    .data(data)
    .join("div")
    .attr("class", "legend")
    .on("click", (event, d) => {
      if (type === "continent") {
        showCountries(d.Continent);
      } else {
        toggleCountry(d.Country);
      }
    });

  legend.append("svg")
    .attr("width", 20)
    .attr("height", 10)
    .append("rect")
    .attr("width", 20)
    .attr("height", 10)
    .attr("fill", d => color(d[type === "continent" ? "Continent" : "Country"]));

  legend.append("span")
    .text(d => d[type === "continent" ? "Continent" : "Country"]);

  // Buttons
  d3.select("#backButton")
    .style("display", type === "continent" ? "none" : "inline")
    .on("click", () => drawChart(continentData, "continent"));

  d3.select("#selectAllBtn")
    .style("display", type === "continent" ? "none" : "inline")
    .text(allVisible ? "Deselect All" : "Select All")
    .on("click", () => toggleAllLines(type));
}

function showCountries(continent) {
  const filtered = allData.filter(d => d.Continent === continent);
  const countryData = Array.from(
    d3.rollup(
      filtered,
      v => v.map(d => ({ Year: d.Year, Value: d.Value })),
      d => d.Country
    ),
    ([Country, values]) => ({
      Country,
      values: values.sort((a, b) => a.Year - b.Year)
    })
  );
  allVisible = true;
  drawChart(countryData, "country", continent);
}

function toggleCountry(countryName) {
  const path = svg.selectAll(".line").filter(d => d.Country === countryName);
  const visible = path.style("opacity") === "1" || path.style("opacity") === "";
  path.transition().style("opacity", visible ? 0 : 1);
}

function toggleAllLines(type) {
  const paths = svg.selectAll(".line");
  allVisible = !allVisible;
  paths.transition().style("opacity", allVisible ? 1 : 0);
  d3.select("#selectAllBtn").text(allVisible ? "Deselect All" : "Select All");
}
