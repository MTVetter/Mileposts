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
        "dojo/on",
        "dojo/dom",
        "dojo/domReady!"
    ], function(Map, MapView, FeatureLayer, LayerList, Expand, Extent, Home, SimpleLineSymbol, SimpleFillSymbol, 
        Search, Draw, Graphic, Polyline, geometryEngine, esriRequest, on, dom){

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
    
        //Creating the popup templates
        var parishTemplate = {
            title: "Parish Name: {Name}",
            content: [{
                type: "fields",
                fieldInfos: [{
                    fieldName: "Parish_FIP",
                    visible: true
                }, {
                    fieldName: "Parish_Num",
                    visible: true
                }, {
                    fieldName: "Population",
                    visible: true,
                    format:{
                        digitSeparator: true,
                        places: 0
                    }
                }]
            }]
        };
    
        
        //Adding in the parish boundaries
        var parish = new FeatureLayer({
            url: "https://giswebnew.dotd.la.gov/arcgis/rest/services/Boundaries/LA_Parishes/FeatureServer/0",
            outFields: ["*"],
            title: "Parishes"
        });
    
        //Add LRSID_Routes
        var routes = new FeatureLayer({
            url: "https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/FeatureServer/0",
            outFields: ["*"],
            title: "LRSID_Routes",
            definitionExpression: "RouteID LIKE '%-%-1-%' OR RouteID LIKE '%-%-2-%'"
        });

        //Add the Mileposts
        var mileposts = new FeatureLayer({
            url: "https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/Milepost/FeatureServer/0",
            outFields: ["*"],
            title: "Mileposts"
        });
    
        map.add(parish);
        map.add(routes);
        map.add(mileposts);

    
        mapSetup();
    
        //====================================
        //Create buttons and widgets for the map
    
        function mapSetup(){
            //Layer list
            var layerList = new LayerList({
                view: view,
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
                allPlaceholder: "Search for a LRSID...",
                locationEnabled: false,
                includeDefaultSources: false,
                popupOpenOnSelect: false,
                sources: [{
                    featureLayer: routes,
                    displayField: "RouteID",
                    searchFields: ["RouteID"],
                    outFields: ["*"],
                    name: "LRSID",
                    zoomScale: 80000,
                    resultSymbol: {
                        type: "simple-line",
                        color: [255, 255, 25],
                        width: 5
                    }
                }, {
                    featureLayer: parish,
                    outFields: ["*"],
                    name: "Parish",
                    zoomScale: 80000,
                    resultSymbol: {
                        type: "simple-line",
                        color: [255, 255, 25],
                        width: 5
                    }
                }]
            });
    
            var searchButton = new Expand({
                expandIconClass: "esri-icon-search",
                expandTooltip: "Search for a LRSID",
                view: view,
                content: searchWidget,
                mode: "floating",
                group: "top-left"
            });

            view.ui.add([homeButton, layerExpand, searchButton], "top-left");

        }
    
        //==================================
        //Add graphic on map click  
        view.on("click", function(event){
            var coordinates = [];
            var x = event.mapPoint.x;
            coordinates.push(x);
            var y = event.mapPoint.y;
            coordinates.push(y);
            createGraphic(coordinates);
        });



        //=============================
        //Create a new graphic presenting the polyline that is being drawn
        function createGraphic(coordinates){
            var x = coordinates[0];
            var y = coordinates[1];

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
                    type: "simple-marker",
                    style: "point",
                    color: [0, 191, 255],
                    size: "12px",
                    outline: {
                        color: [0,0,0],
                        width: 1
                    }
                }
            });

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/1/geometryToMeasure?f=json&locations=['geometry':{'x':" + x+",'y':" +y+ "}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                console.log(json);
                var locations = json.locations[0].results[0];
                var measure = locations.measure;
                $("#milepoint").val(measure);
            });

            view.graphics.add(graphic);

        }

        //Add attributes to the graphic
        function addAttributes(event){
            var result = createGraphic(event)
            addFeature = graphic;
            attributes = [];

            //Check to see if the user entered a parish number
            var parishData = $(".parishNum").val();
            if (parishData){
                attributes["Parish"] = parishData;
            } else {
                getParish(addFeature, attributes);
            }

            //Check to see if the user entered a district
            var distData = $(".dotdDistrict").val();
            if (distData){
                attributes["DOTDDistrict"] = distData;
            } else {
                getDistrict(addFeature, attributes);
            }

            //Check to see if user entered a control section
            var controlData = $(".cs").val();
            if (controlData){
                attributes["ControlSection"] = controlData;
            } else {
                getControl(addFeature, attributes);
            }

            //Check to see if user entered a LRSID
            var lrsData = $(".lrsID").val();
            if (lrsData){
                attributes["LRSID"] = lrsData;
                getLogmiles(addFeature, attributes, lrsData);
            } else {
                getLRS(addFeature, attributes);
            }

            //Check to see if user entered a rural/urban code
            var ruralData = $("#rural").val();
            if (ruralData){
                attributes["UrbanRural"] = ruralData;
            } else {
                getRural(addFeature, attributes);
            }

            //Check to see if user entered a fed aid value
            // var aidData = $(".fedAids").val();
            // if (aidData){
            //     attributes["FedAid"] = aidData;
            // } else {
            //     getAid(addFeature, attributes);
            // }

            // //Check to see if user entered a functional class
            // var functData = $(".functClass").val();
            // if (functData){
            //     attributes["FunctionalSystem"] = functData;
            // } else {
            //     getFunctional(addFeature, attributes);
            // }

            //Check to see if user entered an urbanized area
            var urbanizedData = $("#cities").val();
            if (urbanizedData){
                attributes["UrbanizedArea"] = urbanizedData;
            } else {
                getUrbanized(addFeature, attributes);
            }
            // getAttributes(addFeature, attributes);
            newProject = new Graphic({
                geometry: new Polyline({
                    paths: addFeature.geometry.paths[0],
                    spatialReference: view.spatialReference
                }),
                attributes: attributes
            });
            console.log(JSON.stringify(newProject));
        }


        //=======================================
        //Set up the REST calls to get the attributes
        function getAttributes(path, attributes){
            //Determine the number of clicks the user did
            var num = path.geometry.paths[0].length -1;

            //Get the coordinates of the first click
            var x = path.geometry.paths[0][0][0];
            var y = path.geometry.paths[0][0][1];
            //Get the coordinates of the last click
            var x2 = path.geometry.paths[0][num][0];
            var y2 = path.geometry.paths[0][num][1];

            

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'geometry':{'x':" + x+",'y':" +y+ "}}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                var locations = json.locations[0].results[0];
                var road = locations.routeId;
                var measure = locations.measure;
                var split = road.split("-");
                attributes["LRSID"] = road;
                attributes["BeginLogmile"] = measure;
                attributes["ControlSection"] = split[0] + "-" + split[1];
                $("#lrsid input:text").val(road);
                $("#beginLogmile input:text").val(measure);
                $("#controlsection input:text").val(split[0] + "-" + split[1]);
            });

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'geometry':{'x':" + x2+",'y':" +y2+ "}}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                var locations = json.locations[0].results[0];
                var road = locations.routeId;
                var measure = locations.measure;
                attributes["EndLogmile"] = measure;
                $("#endLogmile input:text").val(measure);
            });

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Boundaries/LA_Parishes/FeatureServer/0/query?where=&objectIds=&time=&geometry="+x+","+ y+"&geometryType=esriGeometryPoint&inSR=102100&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&gdbVersion=&returnDistinctValues=false&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&multipatchOption=&resultOffset=&resultRecordCount=&f=pjson",{
                responseType: "json"
            }).then(function(response){
                var parishJSON = response.data;
                var parishLocations = parishJSON.features[0].attributes;
                var parishName = parishLocations.Parish_Num;
                var district = parishLocations.DOTD_Distr;
                attributes["Parish"] = parishName;
                attributes["DOTDDistrict"] = district;
                $(".parishNum").val(parishName);
                $("#dotdDistrict input:text").val(district);
            });

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Static_Data/LABoundaries/FeatureServer/3/query?where=&objectIds=&time=&geometry=" +x+","+y+"&geometryType=esriGeometryPoint&inSR=102100&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&gdbVersion=&returnDistinctValues=false&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&multipatchOption=&resultOffset=&resultRecordCount=&f=pjson",{
                responseType: "json"
            }).then(function(response){
                var cityJSON = response.data;
                var cityLocations = cityJSON.features[0].attributes;
                var cityCode = cityLocations.Metro_Area_Code;
                if (cityCode){
                    attributes["UrbanizedArea"] = cityCode;
                    $("#cities").find("option[value='" +cityCode+"']").attr("selected",true);
                    attributes["UrbanRural"] = "U";
                    $("#ruralUrban input:text").val("U");
                    
                } else {
                    console.log("It finally worked!");
                    attributes["UrbanizedArea"] = "00003";
                    $("#cities").find("option[value='00003']").attr("selected",true);
                    attributes["UrbanRural"] = "R";
                    $("#ruralUrban input:text").val("R");
                }
            });
            
            return attributes;
        }

        //Set up the REST call to get the parish values
        function getParish(path, attributes){
            //Determine the number of clicks the user did
            var num = path.geometry.paths[0].length -1;

            //Get the coordinates of the first click
            var x = path.geometry.paths[0][0][0];
            var y = path.geometry.paths[0][0][1];
            //Get the coordinates of the last click
            var x2 = path.geometry.paths[0][num][0];
            var y2 = path.geometry.paths[0][num][1];

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Boundaries/LA_Parishes/FeatureServer/0/query?where=&objectIds=&time=&geometry="+x+","+ y+"&geometryType=esriGeometryPoint&inSR=102100&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&gdbVersion=&returnDistinctValues=false&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&multipatchOption=&resultOffset=&resultRecordCount=&f=pjson",{
                responseType: "json"
            }).then(function(response){
                var parishJSON = response.data;
                var parishLocations = parishJSON.features[0].attributes;
                var parishName = parishLocations.Parish_Num;
                var district = parishLocations.DOTD_Distr;
                attributes["Parish"] = parishName;
                $(".parishNum").val(parishName);
            });
            return attributes;
        }

        //Get the district number of the project
        function getDistrict(path, attributes){
            //Determine the number of clicks the user did
            var num = path.geometry.paths[0].length -1;

            //Get the coordinates of the first click
            var x = path.geometry.paths[0][0][0];
            var y = path.geometry.paths[0][0][1];
            //Get the coordinates of the last click
            var x2 = path.geometry.paths[0][num][0];
            var y2 = path.geometry.paths[0][num][1];

            //Determine the district the project is located in
            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Boundaries/LA_Parishes/FeatureServer/0/query?where=&objectIds=&time=&geometry="+x+","+ y+"&geometryType=esriGeometryPoint&inSR=102100&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&gdbVersion=&returnDistinctValues=false&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&multipatchOption=&resultOffset=&resultRecordCount=&f=pjson",{
                responseType: "json"
            }).then(function(response){
                var parishJSON = response.data;
                var parishLocations = parishJSON.features[0].attributes;
                var district = parishLocations.DOTD_Distr;
                attributes["DOTDDistrict"] = district;
                $("#dotdDistrict input:text").val(district);
            });
            return attributes;
        }

        //Get the control section of the project
        function getControl(path, attributes){
            //Determine the number of clicks the user did
            var num = path.geometry.paths[0].length -1;

            //Get the coordinates of the first click
            var x = path.geometry.paths[0][0][0];
            var y = path.geometry.paths[0][0][1];
            //Get the coordinates of the last click
            var x2 = path.geometry.paths[0][num][0];
            var y2 = path.geometry.paths[0][num][1];

            //Determine the control section of the project
            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'geometry':{'x':" + x+",'y':" +y+ "}}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                var locations = json.locations[0].results[0];
                var road = locations.routeId;
                if (road.length === 12){
                    var split = road.split("-");
                    attributes["ControlSection"] = split[0] + "-" + split[1];
                    $("#controlsection input:text").val(split[0] + "-" + split[1]);
                } 
            });
            return attributes;
        }

        //Get the district number of the project
        function getLRS(path, attributes){
            //Determine the number of clicks the user did
            var num = path.geometry.paths[0].length -1;

            //Get the coordinates of the first click
            var x = path.geometry.paths[0][0][0];
            var y = path.geometry.paths[0][0][1];
            //Get the coordinates of the last click
            var x2 = path.geometry.paths[0][num][0];
            var y2 = path.geometry.paths[0][num][1];

            //Determine the district the project is located in
            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'geometry':{'x':" + x+",'y':" +y+ "}}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                if (json.locations[0].results.length > 1){
                    var firstLocation = json.locations[0].results[0];
                    var secondLocation = json.locations[0].results[1];
                    var string = JSON.stringify(firstLocation, ["routeId"]);
                    console.log(string);
                    var confirmLoc = confirm("Do you want to use " +string+ "?\nNote: For non-divided roadways "+
                    "you more than likely want an LRSID like 000-00-1-000");
                    if (confirmLoc == true){
                        var road = firstLocation.routeId;
                        attributes["LRSID"] = road;
                        $("#lrsid input:text").val(road);

                        if (road.length > 12){
                            $(".local").css("display", "table-cell");
                            $(".localValue").css("display", "table-cell");
                            $(".functClass").css("display", "table-cell");
                        }

                        esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'routeId':'" +road+ "','geometry':{'x':" + x+",'y':" +y+ "}},{'routeId':'" +road+ "','geometry':{'x':" + x2+",'y':" +y2+ "}}]&tolerance=10&inSR=102100", {
                            responseType: "json"
                        }).then(function(response){
                            var json = response.data;
                            var beginLocation = json.locations[0].results[0];
                            var beginMeasure = beginLocation.measure;
                            var endLocation = json.locations[1].results[0];
                            var endMeasure = endLocation.measure;

                            //Check to see if the measure from the first point is bigger than second measure
                            if (beginMeasure > endMeasure){
                                //If first measure is greater then put it as end logmile
                                attributes["BeginLogmile"] = endMeasure;
                                $("#beginLogmile input:text").val(endMeasure);
                                attributes["EndLogmile"] = beginMeasure;
                                $("#endLogmile input:text").val(beginMeasure);
                            } else {
                                //If first measure isn't greater then leave it alone
                                attributes["BeginLogmile"] = beginMeasure;
                                $("#beginLogmile input:text").val(beginMeasure);
                                attributes["EndLogmile"] = endMeasure;
                                $("#endLogmile input:text").val(endMeasure);
                            }
                        });
                    } else {
                        var road = secondLocation.routeId;
                        attributes["LRSID"] = road;
                        $("#lrsid input:text").val(road);
    
                        if (road.length > 12){
                            $(".local").css("display", "table-cell");
                            $(".localValue").css("display", "table-cell");
                            $(".functClass").css("display", "table-cell");
                        }
    
                        esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'routeId':'" +road+ "','geometry':{'x':" + x+",'y':" +y+ "}},{'routeId':'" +road+ "','geometry':{'x':" + x2+",'y':" +y2+ "}}]&tolerance=10&inSR=102100", {
                            responseType: "json"
                        }).then(function(response){
                            var json = response.data;
                            var beginLocation = json.locations[0].results[0];
                            var beginMeasure = beginLocation.measure;
                            var endLocation = json.locations[1].results[0];
                            var endMeasure = endLocation.measure;
    
                            //Check to see if the measure from the first point is bigger than second measure
                            if (beginMeasure > endMeasure){
                                //If first measure is greater then put it as end logmile
                                attributes["BeginLogmile"] = endMeasure;
                                $("#beginLogmile input:text").val(endMeasure);
                                attributes["EndLogmile"] = beginMeasure;
                                $("#endLogmile input:text").val(beginMeasure);
                            } else {
                                //If first measure isn't greater then leave it alone
                                attributes["BeginLogmile"] = beginMeasure;
                                $("#beginLogmile input:text").val(beginMeasure);
                                attributes["EndLogmile"] = endMeasure;
                                $("#endLogmile input:text").val(endMeasure);
                            }
                        });
                    }
                

                    // esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'routeId':'" +road+ "','geometry':{'x':" + x2+",'y':" +y2+ "}}]&tolerance=10&inSR=102100", {
                    //     responseType: "json"
                    // }).then(function(response){
                    //     var json = response.data;
                    //     var locations = json.locations[0].results[0];
                    //     var measure = locations.measure;
                    //     attributes["EndLogmile"] = measure;
                    //     $("#endLogmile input:text").val(measure);
                    // });
                } else {
                    var locations = json.locations[0].results[0];
                    var road = locations.routeId;
                    attributes["LRSID"] = road;
                    $("#lrsid input:text").val(road);

                    if (road.length > 12){
                        $(".local").css("display", "table-cell");
                        $(".localValue").css("display", "table-cell");
                        $(".functClass").css("display", "table-cell");
                    }

                    esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'routeId':'" +road+ "','geometry':{'x':" + x+",'y':" +y+ "}},{'routeId':'" +road+ "','geometry':{'x':" + x2+",'y':" +y2+ "}}]&tolerance=10&inSR=102100", {
                        responseType: "json"
                    }).then(function(response){
                        var json = response.data;
                        var beginLocation = json.locations[0].results[0];
                        var beginMeasure = beginLocation.measure;
                        var endLocation = json.locations[1].results[0];
                        var endMeasure = endLocation.measure;

                        //Check to see if the measure from the first point is bigger than second measure
                        if (beginMeasure > endMeasure){
                            //If first measure is greater then put it as end logmile
                            attributes["BeginLogmile"] = endMeasure;
                            $("#beginLogmile input:text").val(endMeasure);
                            attributes["EndLogmile"] = beginMeasure;
                            $("#endLogmile input:text").val(beginMeasure);
                        } else {
                            //If first measure isn't greater then leave it alone
                            attributes["BeginLogmile"] = beginMeasure;
                            $("#beginLogmile input:text").val(beginMeasure);
                            attributes["EndLogmile"] = endMeasure;
                            $("#endLogmile input:text").val(endMeasure);
                        }
                    });
                } 

                    // esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'routeId':'" +road+ "','geometry':{'x':" + x2+",'y':" +y2+ "}}]&tolerance=10&inSR=102100", {
                    //     responseType: "json"
                    // }).then(function(response){
                    //     var json = response.data;
                    //     var locations = json.locations[0].results[0];
                    //     var measure = locations.measure;
                    //     attributes["EndLogmile"] = measure;
                    //     $("#endLogmile input:text").val(measure);
                    // });  
            });
            return attributes;
        }

        //Get the beginning and ending logmile
        function getLogmiles(path, attributes, data){
            //Determine the number of clicks the user did
            var num = path.geometry.paths[0].length -1;

            //Get the coordinates of the first click
            var x = path.geometry.paths[0][0][0];
            var y = path.geometry.paths[0][0][1];
            //Get the coordinates of the last click
            var x2 = path.geometry.paths[0][num][0];
            var y2 = path.geometry.paths[0][num][1];

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'routeId':'" +data+ "','geometry':{'x':" + x+",'y':" +y+ "}}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                var locations = json.locations[0].results[0];
                var measure = locations.measure;
                attributes["BeginLogmile"] = measure;
                $("#beginLogmile input:text").val(measure);
            });

            esriRequest("https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/State_LRS_Route_Networks/MapServer/exts/LRSServer/networkLayers/0/geometryToMeasure?f=json&locations=[{'routeId':'" +data+ "','geometry':{'x':" + x2+",'y':" +y2+ "}}]&tolerance=10&inSR=102100", {
                responseType: "json"
            }).then(function(response){
                var json = response.data;
                var locations = json.locations[0].results[0];
                var measure = locations.measure;
                attributes["EndLogmile"] = measure;
                $("#endLogmile input:text").val(measure);
            });
            return attributes;
        }
    });

    //========================================================================
    //jQuery functions when clicking buttons


    //Create a dialog box when click the info button
    //Create a jQuery UI dialog box
    var dialog = $("#dialog").dialog({
        autoOpen: false,
        height: 350,
        width: 250,
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

    //Create a dialog box when click the help button
    //Create a jQuery UI dialog box
    var helpDialog = $("#helpDialog").dialog({
        autoOpen: false,
        height: window.innerHeight - 100,
        width: window.innerWidth - 400,
        modal: true,
        position:{
            my: "center center",
            at: "center center",
            of: "#wrapper"
        },
        buttons:{
            "Close": function(){
                helpDialog.dialog("close");
            }
        },
        close: function (){
            console.log("Dialog has successfully closed");
        }
    });
    
    //Click the about button to open the dialog
    $("#helpbtn").on("click", function(e){
        helpDialog.dialog("open");
    });

    
})
