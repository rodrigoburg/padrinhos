var tamanho = 0;

var margin = {top: 20, right: 0, bottom: 40, left: 0},
    //aspect = 400 / 950,
    width = $("#chart").width(),
    height = ($("#chart").height()-margin.bottom/3), //width * aspect,
    aspect = height / width,//height / width,
    formatNumber = d3.format(",d"),
    transitioning;

//Para Tooltip
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
      .style("opacity", 0);

var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height])
    .range([0, height]);

var treemap = d3.layout.treemap()
    .children(function(d, depth) { return depth ? null : d._children; })
    .sort(function(a, b) { return a.value - b.value; })
    .ratio(aspect * 0.3 * (1 + Math.sqrt(5)))
    .round(false);

var svg = d3.select("#chart").append("svg")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("width", width )
    .attr("height", height + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + ",0)")
    .style("shape-rendering", "crispEdges");

$(window).resize(function(){
    var width = $("#chart").width();
    svg.attr("width", width);
    svg.attr("height", height);
});

var grandparent = svg.append("g")
    .attr("class", "grandparent");

grandparent.append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", margin.top);

grandparent.append("text")
    .attr("x", 6)
    .attr("y", 6 - margin.top)
    .attr("dy", ".75em");

d3.json("dados/aecio.json", function(root) {
  initialize(root);
  accumulate(root);
  layout(root);
  display(root);

  function initialize(root) {
    root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  // We also take a snapshot of the original children (_children) to avoid
  // the children being overwritten when when layout is computed.
  function accumulate(d) {
    return (d._children = d.children)
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d._children) {
      treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    grandparent
        .datum(d.parent)
  
      .select("text")
        .text("Total de Aécio Neves (PSDB): R$ "+formatNumber(d.value));

    var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

    var g = g1.selectAll("g")
        .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children; })
        .classed("children", true)
        .on("click", transition)
      
        
    g.selectAll(".child")
        .data(function(d) { return d._children || [d]; })
      .enter().append("rect")
        .attr("class", "child")
        .call(rect);

    g.append("rect")
        .attr("class", "parent")
        .call(rect)
        .attr("id",function (d) { return tira_espaco(d.name)})
        .on('mouseover', function(d) {
            div.transition()
                .duration(200)
                .style("opacity", 1);
            div.html("<b>"+d.name + "</b><br/>R$ " + formatNumber(d.value).replace(",",".").replace(",",".") + "<br/>" + (parseInt(d.area * 1000)/10 + "%") + " de Aécio Neves (PSDB)")
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY + 28) + "px")

        })
        .on('touchstart', function(d) {
            var t2 = d3.event.timeStamp,
                t1 = $(this).data('lastTouch') || t2,
                dt = t2 - t1,
                fingers = d3.event.touches.length;
            $(this).data('lastTouch',t2);
            if (!dt || dt > 700 || fingers > 1) {
                div.transition()
                    .duration(200)
                    .style("opacity", 1);
                div.html(d.name + ":<br/>R$ " + formatNumber(d.value).replace(",",".").replace(",",".") + "<br/>" + (parseInt(d.area * 1000)/10 + "%") + " de Aécio Neves (PSDB)")
                    .style("left", (d3.event.touches[0].pageX - 60) + "px")
                    .style("top", (d3.event.touches[0].pageY - 60) + "px");
                d3.event.preventDefault();
            } else {
                div.transition()
                    .duration(800)
                    .style("opacity", 0);
            }
        })
        .on('mousemove', function(d) {
            div.style("left", (d3.event.pageX - 100) + "px")
                .style("top", (d3.event.pageY - 60) + "px");
        })
        .on("mouseout", function(d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });


        //aqui coloca o texto só se a área for grande o suficiente...
    g.append("text")
        .attr("dy", ".75em")
        .text(function(d) { 
            retorno = d.name
            if (d.area < 0.01) { retorno = "" }
            return retorno
        })
        .style("font-size", function(d) { 
            tamanho = Math.min((d.area+0.03)*25,10)
            if (d.name.length > 20) {
                tamanho = Math.min(tamanho*0.75,10)
            }
            return (tamanho*window.width/2500) + "em"; })
        .attr("width", function(d) { return $("rect[nome='"+d.name+"']").attr("width") })
        .call(text)
        .each(arrumaTexto)

    function transition(d) {
      if (transitioning || !d) return;
      transitioning = true;

      div.transition()
        .duration(800)
        .style("opacity", 0);

      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // Transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0);
      t2.selectAll("text").call(text).style("fill-opacity", 1).each("end",arrumaTexto);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);
      

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
            
    }
    return g;
  }

  function text(text) {
    text.attr("x", function(d) { return x(d.x) + 6; })
        .attr("y", function(d) { return y(d.y) + 6; })
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
  }

});


function arrumaTexto(d) {
    if(d.area > 0.01) { 
        var nome = d.name,
        id = tira_espaco(nome),
        elemento = $(this),
        pos_y = elemento.attr("y"),
        pos_x = elemento.attr("x"),
        dy = 1
        if(nome != "" && nome.indexOf("VOLTAR") < 0) {
            var texto = d3.select(this),
            words = nome.split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            tspan = texto.text(null).append("tspan").attr("dy", dy + "em"),
            width = parseFloat($("rect#"+id+".parent").attr("width")) - 20
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan[0][0].offsetWidth > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = texto.append("tspan").attr("x",pos_x).attr("dy", dy + "em").text(word);
                    tspan.attr("x",pos_x)
                }
            }
        }
    }
}

function tira_espaco(t) {
    return t.replace(/\s+/g,"").replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'')
}

