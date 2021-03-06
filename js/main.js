/* Main JavaScript sheet for Project Request Form by Michael Vetter*/
$(document).ready(function (){
    require([
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/FeatureLayer",
        "esri/widgets/LayerList",
        "esri/widgets/Expand",
        "esri/geometry/Extent",
        "esri/widgets/Home",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/widgets/Search",
        "esri/views/2d/draw/Draw",
        "esri/Graphic",
        "esri/geometry/Polyline",
        "esri/geometry/geometryEngine",
        "esri/request",
        "esri/widgets/Track",
        "dojo/on",
        "dojo/dom",
        "dojo/domReady!"
    ], function(Map, MapView, FeatureLayer, LayerList, Expand, Extent, Home, SimpleLineSymbol, SimpleFillSymbol, 
        Search, Draw, Graphic, Polyline, geometryEngine, esriRequest, Track, on, dom){

        //========================================
        //Create a list of global variables
        var graphic;
        var attributes;
        var addFeature;
        var newProject;
        var controlSectionValue;
    
        //========================================
        //Create the map and add layers
    
        var map = new Map({
            basemap: "streets-navigation-vector"
        });
    
        var homeExtent = new Extent({
            xmin: -10201602.81762082,
            xmax: -10224989.48107227,
            ymin: 3672629.538129259,
            ymax: 3685031.445968512,
            spatialReference: 102100
        });
    
        //Create the view that will hold the map
        var view = new MapView({
            container: "viewDiv",
            map: map,
            extent: homeExtent,
            zoom: 7
        });
        
        //Adding in the parish boundaries
        var parish = new FeatureLayer({
            url: "https://giswebnew.dotd.la.gov/arcgis/rest/services/Boundaries/LA_Parishes/FeatureServer/0",
            outFields: ["*"],
            title: "Parishes"
        });
    
        //Add LRSID_Routes
        var routes = new FeatureLayer({
            url: "https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/FeatureServer/1",
            outFields: ["*"],
            title: "StatewideRoutes",
            definitionExpression: "RouteID LIKE '999_%_1_1_%' OR RouteID LIKE '999_%_2_2_%'"
        });
        

        //Add the Mileposts
        var mileposts = new FeatureLayer({
            url: "https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/Milepost/FeatureServer/0",
            outFields: ["*"],
            title: "Mileposts"
        });

        //Add the state trooper boundaries
        var stateTroops = new FeatureLayer({
            url: "https://giswebnew.dotd.la.gov/arcgis/rest/services/Static_Data/LABoundaries/FeatureServer/5",
            outFields: ["*"],
            title: "State Police Troops"
        });
    
        map.add(parish);
        map.add(stateTroops);
        map.add(mileposts);

    
        mapSetup();
    
        //====================================
        //Create buttons and widgets for the map
    
        function mapSetup(){
            //Layer list
            var layerList = new LayerList({
                view: view,
                listItemCreatedFunction: function(event){
                    const item = event.item;
                    item.panel = {
                        content: "legend",
                        open: true
                    };
                }
            });
    
    
            //Create a button to hide/expand the layer list
            var layerExpand = new Expand({
                expandIconClass: "esri-icon-layers",
                expandTooltip: "Turn on and off Map Layers",
                expanded: false,
                view: view,
                content: layerList,
                mode: "floating",
                group: "top-left"
            });
    
            //Home button
            var homeButton = new Home({
                view: view
            });
    
            //Search button
            var searchWidget = new Search({
                view: view,
                allPlaceholder: "Search for a Route...",
                locationEnabled: false,
                includeDefaultSources: false,
                popupOpenOnSelect: false,
                sources: [{
                    featureLayer: routes,
                    displayField: "RouteNameFull",
                    searchFields: ["RouteNameFull"],
                    outFields: ["RouteNameFull"],
                    filter: {
                        where: "RouteID LIKE '999_%_1_1_%' OR RouteID LIKE '999_%_2_2_%'"
                    },
                    name: "Routes",
                    zoomScale: 450000,
                    resultSymbol: {
                        type: "simple-line",
                        color: [197, 0, 255, 0.5],
                        width: 3
                    }
                }, {
                    featureLayer: parish,
                    outFields: ["*"],
                    name: "Parish",
                    zoomScale: 500000,
                    resultSymbol: {
                        type: "simple-line",
                        color: [255, 255, 25],
                        width: 5
                    }
                }]
            });
    
            var searchButton = new Expand({
                expandIconClass: "esri-icon-search",
                expandTooltip: "Search for a Route",
                view: view,
                content: searchWidget,
                mode: "floating",
                group: "top-left"
            });

            var track = new Track({
                viewModel: {
                    view: view,
                    scale: 5000
                }
            });

            view.ui.add([homeButton, layerExpand, searchButton, track], "top-left");

        }
    
        //==================================
        //Add graphic on map click  
        view.on("click", function(event){
            view.graphics.removeAll();
            var coordinates = [];
            var x = event.mapPoint.x;
            coordinates.push(x);
            var y = event.mapPoint.y;
            coordinates.push(y);
            var lat = Math.round(event.mapPoint.latitude * 1000000)/1000000;
            var long = Math.round(event.mapPoint.longitude * 1000000)/1000000;
            $("#latitude").text(lat);
            $("#longitude").text(long);
            createGraphic(coordinates, lat, long);
        });



        //=============================
        //Create a new graphic presenting the polyline that is being drawn
        function createGraphic(coordinates, lat, long){
            var x = coordinates[0];
            var y = coordinates[1];
            console.log(x);
            console.log(y);

            var point = {
                type: "point",
                x: x,
                y: y,
                spatialReference: view.spatialReference
            };

            //Graphic representing the polyline
            graphic = new Graphic({
                geometry: point,
                symbol:{
                    type: "picture-marker",
                    url: "img/collide.png",
                    width: 45,
                    height: 45
                }
            });

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/1/geometryToMeasure?f=json&locations=[{'geometry':{'x':" + x+",'y':" +y+ "}}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                var locations = json.locations[0].results[0];
                var route = locations.routeId;
                var split = route.split("_");
                var routeNumber = split[1];
                var measure = locations.measure;
                var roundedMilepoint = Math.round(measure * 1000)/1000;
                var rounded = Math.round(measure * 10)/ 10;
                $("#route").text(route);
                $("#milepoint").text(roundedMilepoint);
                $("#milepost").text(rounded);
                showPopup(lat, long, routeNumber, rounded, roundedMilepoint, point);
            });


            view.graphics.add(graphic);

        }

        //Create a popup window
        function showPopup(lat, long, route, rounded, measure, point){
            view.popup.open({
                title: "Selected route: " + route,
                content: "Milepoint: " +measure+"<br>Milepost: "+rounded+"<br>Lat/Long: " +lat+", "+long,
                location: point
            });
        }

    });

    //========================================================================
    //jQuery functions when clicking buttons


    //Create a dialog box when click the info button
    //Create a jQuery UI dialog box
    var dialog = $("#dialog").dialog({
        autoOpen: false,
        height: window.innerHeight - 350,
        width: window.innerWidth - 400,
        modal: true,
        position:{
            my: "center center",
            at: "center center",
            of: "#wrapper"
        },
        buttons:{
            "Close": function(){
                dialog.dialog("close");
            }
        },
        close: function (){
            console.log("Dialog has successfully closed");
        }
    });
    
    //Click the about button to open the dialog
    $(".about").on("click", function(e){
        dialog.dialog("open");
    });
    
})
