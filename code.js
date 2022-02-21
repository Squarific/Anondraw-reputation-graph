var svg = d3.select("svg"),
    width = +svg.node().getBoundingClientRect().width,
    height = +svg.node().getBoundingClientRect().height;

var allLinksSVG;
var allNodesSVG;
// svg objects
var link, node;
// the data - an object with nodes and links
var graph;
var reputations;


/*{
  "nodes": [
    {"id": "Myriel", "group": 1}
  ],
  "links": [
    {"source": "Napoleon", "target": "Myriel", "value": 1}
  ]
}*/

var stepSize = 10;
var stepTime = 1000;
var min = 0;
var max = min + stepSize;

var nodesCreated = [];
var nodes = [];
var links = [];
var linkMap = {};
var initialized = false;

function createNode (node) {
  if (nodesCreated[node]) return;
  nodesCreated[node] = true;
  
  var datanode = { id: node, group: 1, x: 500, y: 500};
  nodes.push(datanode);
}

function createLink (n1, n2, weight) {
  if (n1 < n2) {
    var temp = n2;
    n2 = n1;
    n1 = temp;
  }
  
  return false;
  //if (n1 !== 1529 && n2 !== 1529) return false;
  
  if (!linkMap[n1]) linkMap[n1] = {};
  if (linkMap[n1][n2]) return false;
  
  linkMap[n1][n2] = true;
  var datalink = { source: n1, target: n2, value: weight };
  links.push(datalink);
  
  return true;
}

function handleRep (rep) {
  createNode(rep[1]);
  createNode(rep[2]);
  return createLink(rep[1], rep[2], rep[4]);
}
  
function nextGraph () {
  if (min > reputations.length) return;
  for (var k = min; k < max; k++) {
    if (!reputations[k]) continue;
    
    if (!handleRep(reputations[k])) {
      max += 1;
      
      if (min > reputations.length) break;
    }
  }

  graph = { nodes: nodes, links: links };
  simulation.nodes(graph.nodes);
  simulation.alpha(Math.max(simulation.alpha(),0.05)).restart();

  min = max;
  max += stepSize;
  
  console.log(min + " of " + reputations.length)
  
  allNodesSVG.selectAll("circle").data(nodes).enter().append("circle").call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
            
  allLinksSVG.selectAll("line").data(links).enter().append("line");
  
  updateDisplay();
}

// load the data
d3.json("reputations.json", function(error, _graph) {
  if (error) throw error;
  reputations = _graph;
  
  graph = { nodes: nodes, links: links };
  
  initializeDisplay();
  initializeSimulation();
  
  nextGraph();
  setInterval(nextGraph, stepTime);
});

//////////// FORCE SIMULATION //////////// 

// force simulator
var simulation = d3.forceSimulation();

// set up the simulation and event to update locations after each tick
function initializeSimulation() {
  simulation.nodes(graph.nodes);
  initializeForces();
  simulation.on("tick", ticked);
}

// values for all forces
forceProperties = {
    center: {
        x: 0.5,
        y: 0.5
    },
    charge: {
        enabled: true,
        strength: -30,
        distanceMin: 1,
        distanceMax: 2000
    },
    collide: {
        enabled: true,
        strength: .7,
        iterations: 1,
        radius: 5
    },
    forceX: {
        enabled: true,
        strength: .1,
        x: .5
    },
    forceY: {
        enabled: true,
        strength: .1,
        y: .5
    },
    link: {
        enabled: true,
        distance: 30,
        iterations: 1
    }
}

// add forces to the simulation
function initializeForces() {
    // add forces and associate each with a name
    simulation
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());
    // apply properties to each of the forces
    updateForces();
}

// apply new force properties
function updateForces() {
    // get each force by name and update the properties
    simulation.force("center")
        .x(width * forceProperties.center.x)
        .y(height * forceProperties.center.y);
    simulation.force("charge")
        .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax);
    simulation.force("collide")
        .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
        .radius(forceProperties.collide.radius)
        .iterations(forceProperties.collide.iterations);
    simulation.force("forceX")
        .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
        .x(width * forceProperties.forceX.x);
    simulation.force("forceY")
        .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
        .y(height * forceProperties.forceY.y);
    simulation.force("link")
        .id(function(d) {return d.id;})
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations)
        .links(forceProperties.link.enabled ? graph.links : []);

    // updates ignored until this is run
    // restarts the simulation (important if simulation has already slowed down)
    simulation.alpha(1).restart();
}



//////////// DISPLAY ////////////

// generate the svg objects and force simulation
function initializeDisplay() {
  allLinksSVG = svg.append("g").attr("class", "links");
  allNodesSVG = svg.append("g").attr("class", "nodes");
  
  // set the data and properties of link lines
  allLinksSVG
    .selectAll("line")
    .data(graph.links)
    .enter().append("line");

  // set the data and properties of node circles
  allNodesSVG
    .selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

  // node tooltip
  /*node.append("title")
      .text(function(d) { return d.id; });*/
  // visualize the graph
  updateDisplay();
}

// update the display based on the forces (but not positions)
function updateDisplay() {
    allNodesSVG
    .selectAll("circle")
        .attr("r", forceProperties.collide.radius)
        .attr("stroke", forceProperties.charge.strength > 0 ? "blue" : "red")
        .attr("stroke-width", forceProperties.charge.enabled==false ? 0 : Math.abs(forceProperties.charge.strength)/15);

    allLinksSVG
    .selectAll("line")
        .attr("stroke-width", forceProperties.link.enabled ? 1 : .5)
        .attr("opacity", forceProperties.link.enabled ? 1 : 0);
}

// update the display positions after each simulation tick
function ticked() {
    allLinksSVG
    .selectAll("line")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    allNodesSVG
    .selectAll("circle")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
    d3.select('#alpha_value').style('flex-basis', (simulation.alpha()*100) + '%');
}



//////////// UI EVENTS ////////////

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0.0001);
  d.fx = null;
  d.fy = null;
}

// update size-related forces
d3.select(window).on("resize", function(){
    width = +svg.node().getBoundingClientRect().width;
    height = +svg.node().getBoundingClientRect().height;
    updateForces();
});

// convenience function to update everything (run after UI input)
function updateAll() {
    updateForces();
    updateDisplay();
}