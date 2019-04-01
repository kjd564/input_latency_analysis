const LABEL_INDICES = {
  'all': 0,
  'queue': 1,
  'handle': 2,
};

// Generated from http://tools.medialab.sciences-po.fr/iwanthue/
const COLORS = ["#a1455d", "#e27d8f", "#dc425b", "#ac4b3b",
		"#d94b2d", "#e39771", "#c7682b", "#e19a37",
		"#8f6631", "#ab8d37", "#bdba39", "#acb16c",
		"#65702b", "#82a339", "#489a31", "#3c7832",
		"#62c656", "#64b776", "#3a8864", "#5acea3",
		"#41bab2", "#4dbcdf", "#6291d3", "#5c6fda",
		"#6d64aa", "#9358ca", "#d18ecf", "#cb59c4",
		"#9c4d87", "#d74590"];

var GRAPH_DATA = {};

async function generateGraph(input_event, title) {
  var raw = {labels: ['all', 'queue', 'handle'], datasets:[]};
  var normalized = {labels: ['all', 'queue', 'handle'], datasets:[]};
  GRAPH_DATA[input_event] = {'raw':raw, 'normal':normalized};
    
  const all = await fetch("data/" + input_event + "_all.csv");
  const all_text = await all.text();
  var all_parsed = parseCSVdata(all_text);
  addDataPerEvent(all_parsed, raw, LABEL_INDICES.all);
  addDataPerEvent(normalize(all_parsed), normalized, LABEL_INDICES.all);

  const queue = await fetch("data/" + input_event + "_queue.csv");
  const queue_text = await queue.text();
  var queue_parsed = parseCSVdata(queue_text);
  addDataPerEvent(queue_parsed, raw, LABEL_INDICES.queue);
  addDataPerEvent(normalize(queue_parsed), normalized, LABEL_INDICES.queue);

  const handle = await fetch("data/" + input_event + "_handle.csv");
  const handle_text = await handle.text();
  var handle_parsed = parseCSVdata(handle_text);
  addDataPerEvent(handle_parsed, raw, LABEL_INDICES.handle);
  addDataPerEvent(normalize(handle_parsed), normalized, LABEL_INDICES.handle);

  createChart(input_event, title, normalized);
}

function parseCSVdata(data) {
  var parsed = {};
  const splited = data.split('\n');
  for (const line of splited) {
     var s = line.split(',');
     parsed[s[0]] = parseFloat(s[1]);
  }
  return parsed;
}

// Normalized data returned by parseCSVdata
function normalize(events) {
  var sum = Object.keys(events).reduce((sum,key)=>sum+parseFloat(events[key]||0),0);
  var normalized = Object.assign({}, events);
  for (key in normalized) {
    normalized[key] = normalized[key] / sum;
  }
  return normalized;
}

// Adds parseCSVdata to a data object formatted for Chartjs
function addDataPerEvent(events, data, label_index) {
  for (event in events) {
    var index = eventInData(event, data.datasets);
    if (index === false) {
      var point = {label:event, data:[0,0,0]};
      data.datasets.push(point);
      index = data.datasets.length - 1;
    }
    data.datasets[index].data[label_index] = events[event];
    data.datasets[index].backgroundColor = COLORS[index];
  }
}

// Checks if an event is already in Chartjs data object
function eventInData(event, data) {
  for (var i = 0; i < data.length; i++) {
    if (data[i].label === event) {
      return i;
    }
  }
  return false;
}

function toggleLegend(chart) {
  if (chart.options.legend.display === true) {
    chart.options.legend.display = false;
  } else {
    chart.options.legend.display = true;
  }
  chart.update();
}

function toggleDataType(but, input_event,  chart) {
  if (but.innerHTML === "Normalized Data") {
    chart.config.data = GRAPH_DATA[input_event].normal;
    but.innerHTML = "Raw Data";
    chart.config.options.scales.xAxes[0].ticks.max = 1;
    chart.config.options.scales.xAxes[0].scaleLabel.labelString = 'duration (%)';
  } else {
    chart.config.data = GRAPH_DATA[input_event].raw;
    but.innerHTML = "Normalized Data";
    chart.config.options.scales.xAxes[0].ticks.max = 2500
    chart.config.options.scales.xAxes[0].scaleLabel.labelString = 'duration (ms)';
  }
  chart.update();
}

// Creates div and adds a canvas with the cart to that div
// Also adds buttons for toggling the legend on and off and 
// switching between normalized and raw data.
function createChart(input_event, title, event_data) {
  var div = document.createElement('div');
  div.setAttribute("id", input_event);

  var canvas = document.createElement("CANVAS");
  div.appendChild(canvas);
    
  var ctx = canvas.getContext("2d");
  var chart = new Chart(ctx, {
    type: 'horizontalBar',
    data: event_data,
    options: {
      title: {
        display: true,
	text: title
      },
      legend: {
        display: false,
	position: 'bottom',
      },
      scales: {
        yAxes: [{
	  stacked: true,
	}],
	xAxes: [{
	  stacked: true,
	  ticks: {
	    max:1.0
	  },
	  scaleLabel: {
	    display: true,
	    labelString: 'duration (%)'
	  }
	}],
      }
    },
  });

  // Button to toggle the legend
  var legend = document.createElement("button");
  legend.innerHTML = "Toggle Legend"; 
  legend.onclick = function() {
    toggleLegend(chart);
  };
  div.appendChild(legend);

  // Button to change between raw and normalized data
  var rep = document.createElement("button");
  rep.innerHTML = "Raw Data";
  rep.onclick = function() {
    toggleDataType(rep, input_event, chart);
  };
  div.appendChild(rep);
    
  document.body.appendChild(div);
}
