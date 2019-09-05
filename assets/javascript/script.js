//global API URL's / api keys
const issPositionAPI = "https://api.wheretheiss.at/v1/satellites/25544";
// this is our google maps api key and link
const googleMapsAPI = "https://maps.googleapis.com/maps/api/js?key=AIzaSyAvh-RJE3-FnbTJlwKg-npCYZl_Yo8P6RU&callback=initMap";

const modal = document.getElementById("myModal");
const span = document.getElementsByClassName("close")[0];
// main onLoad function that greets the user
window.onload = function () {
    modal.style.display = "block";
}
span.onclick = function () {
    modal.style.display = "none";
}
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
let isPlaying = true;

function playBeep() {

    if (isPlaying) {
        let beep = document.getElementById("beep");
        isPlaying = true;
        setInterval(() => {
            if (isPlaying) {
                beep.play();
            }
        }, 4500)
    }

}



let map;

let shown = false;
//global vars for setting forage loops
let lat_global = "";
let lon_global = "";

//the distance global variables to save to local forage because the data is already being processed so why not save it for display
let distance_global = "";
let city_cords_global = {
    lat: 44.948628,
    lon: -93.245329,
    city: "Minneapolis"
}
// global weather coords
let lat_WeatherGlobal = "";
let lon_WeatherGlobal = "";

//store the interval for displaying data in the right bar normally when the menu is not present as to be able to start and stop it
let rightBarDataGlobal = {
    timerInterval: null,
    isRunning: false
}

//this controls the polyline if true then show polyline if not then don't show it
let isEnabled = true;
let polylineColor = "red";

getLastPoints();
displayRightBarData();


let geocoder;

//converted the map dot to an svg so we can change the color on the fly
let mapDot;


// our main map function
function initMap() {
    // gets iss API and plugs that info into coords for map
    getIssPosition(function (data) {
        map = new google.maps.Map(document.getElementById("map"), {
            center: {
                lat: data.lat,
                lng: data.lon
            },
            zoom: 5,
            mapTypeId: google.maps.MapTypeId.SATELLITE
        });
        mapDot = {
            path: 'M25 125 c-14 -13 -25 -36 -25 -50 0 -33 42 -75 75 -75 33 0 75 42 75 75 0 14 -11 37 -25 50 -13 14 -36 25 -50 25 -14 0 -37 -11 -50 -25z',
            fillColor: 'red',
            fillOpacity: 1,
            scale: 0.1,
            anchor: new google.maps.Point(77, 77)
        };
        geocoder = new google.maps.Geocoder();
        codeAddress();

        //adds marker that centers on iss
        issMarker = new google.maps.Marker({
            position: new google.maps.LatLng(data.lat, data.lon),
            map: map,
            icon: mapDot,
            title: "the ISS",
            optimized: false
        })

        //1 second loop that updates and moves the blinking iss marker across the map
        setInterval(() => {

            getIssPosition(function (data) {
                    let pos = {
                        lat: data.lat,
                        lng: data.lon
                    };
                    issMarker.setPosition(pos);
                    document.getElementById("issLocationLat").innerHTML = data.lat;
                    document.getElementById("issLocationLon").innerHTML = data.lon;
                    createPolyLine();
                },
                function () {
                    handleLocationError(true, issMarker, map.getCenter());
                })

        }, 1000)
        console.log(data);
        playBeep();
    })
}

let customLocation;

function codeAddress() {
    geocoder.geocode({
        'address': city_cords_global.city
    }, function (results, status) {
        if (status == 'OK') {
            let mapDotBlue = mapDot;
            mapDotBlue.fillColor = "blue";
            if (customLocation === undefined) {
                customLocation = new google.maps.Marker({
                    map: map,
                    icon: mapDotBlue,
                    position: results[0].geometry.location,
                    title: "Custom Location",
                });
            } else {
                customLocation.setPosition(results[0].geometry.location);
            }
            city_cords_global.lat = customLocation.getPosition().lat();
            city_cords_global.lon = customLocation.getPosition().lng();
        } else {
            createDisplayModal('Location Could not Be found: ' + status)
        }
    });
}

let flightPath;
// creates a polyline between two points. gg Coop
function createPolyLine() {
    var flightPlanCoordinates = [{
            lat: city_cords_global.lat,
            lng: city_cords_global.lon
        },
        {
            lat: lat_global,
            lng: lon_global
        }
    ];
    if (isEnabled === false) {
        if (flightPath === undefined) return
        flightPath.setMap(null);
        flightPath = undefined;
        return
    }
    if (flightPath === undefined) {
        flightPath = new google.maps.Polyline({
            path: flightPlanCoordinates,
            geodesic: true,
            strokeColor: polylineColor,
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        flightPath.setMap(map);
    } else {
        flightPath.setMap(null);
        flightPath = new google.maps.Polyline({
            path: flightPlanCoordinates,
            geodesic: true,
            strokeColor: polylineColor,
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        flightPath.setMap(map);
    }
}


//this function fetches the position data from the api
function getIssPosition(callbackFunction) {
    fetch(issPositionAPI)
        .then(response => {
            return response.json();
        })
        .then(responseJson => {
            //position data of iss here
            callbackFunction({
                lat: responseJson.latitude,
                lon: responseJson.longitude
            })
            lat_global = responseJson.latitude;
            lon_global = responseJson.longitude;

            // lat_WeatherGlobal = responseJson.latitude;
            // lon_WeatherGlobal = responseJson.longitude;
        })
}

// the loop that pushes lat and lon to localForage
setInterval(() => {
    //combined the localTime array and issArray so we do not have to mess with 2 arrays to get the time 
    let time = moment().format('MMMM Do YYYY, h:mm:ss a');
    localforage.getItem("issArray").then(function (results) {
        let issData = results || [];
        issData.unshift({ //changed from push to unshift so newest will always be at the top 
            lat: lat_global,
            lon: lon_global,
            time: time,
            distance: distance_global,
            cityData: city_cords_global
        });

        // this keeps the data from being stored more that 100 items/ always keeps the newer data
        if (issData.length > 150) issData.pop();
        localforage.setItem("issArray", issData).then(function () {

        });
    })
}, 30000)


//function that grabs the last few lat lon points from localForage
function getLastPoints() {
    localforage.getItem("issArray").then(function (results) {
        if (results === null) return;
        console.log({
            coordsA: results[results.length - 1],
            coordsB: results[results.length - 2],
            coordsC: results[results.length - 3]
        })
    })
}



//grab the right bar and put it into a variable
const rightBar = document.getElementById("mainInput");

//menu animation with anime.js
const menuElement = document.getElementById("menu");
menuElement.addEventListener("click", function () {


    if (menuElement.classList.contains("open")) {
        rightBar.innerHTML = "";
        displayRightBarData();
        anime({
            targets: "div#menu",
            rotate: {
                value: 0,
                duration: 1000,
                easing: "easeInOutSine"
            }
        });
        anime({
            targets: "span#row2",
            rotate: {
                value: 0
            }
        });
        anime({
            targets: "span#row3",
            rotate: {
                value: 0
            }
        });
        anime({
            targets: "span#row1, span#row4",
            opacity: 1
        });
        menuElement.classList.remove("open");
    } else {
        anime({
            targets: "div#menu",
            rotate: {
                value: 360,
                duration: 1000,
                easing: "easeInOutSine"
            }
        });
        anime({
            targets: "span#row2",
            rotate: {
                value: -45
            }
        });
        anime({
            targets: "span#row3",
            rotate: {
                value: 45
            }
        });
        anime({
            targets: "span#row1, span#row4",
            opacity: 0
        });
        menuElement.classList.add("open");
        loadRight();
        displayRightBarData();
    }
});


// distance function


function distanceMath() {
    //placeholder coords are Minneapolis -  Now in global variable to be changed upon input
    (calcCrow(city_cords_global.lat, city_cords_global.lon, lat_global, lon_global).toFixed(1));
    //This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
    function calcCrow(lat1, lon1, lat2, lon2) {
        var R = 6371; // km
        var dLat = toRad(lat2 - lat1);
        var dLon = toRad(lon2 - lon1);
        var lat1 = toRad(lat1);
        var lat2 = toRad(lat2);

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        document.getElementById("issDistance").innerHTML = Math.floor(d) + " Kilometers";
        distance_global = Math.floor(d) + " Kilometers";
        return d;
    }

    // Converts numeric degrees to radians
    function toRad(Value) {
        return Value * Math.PI / 180;
    }

}

//updates the distance matrix every second to display a dynamic html distance
setInterval(() => {
    distanceMath();
}, 1000)

//making a function that loads dynamic data and input fields onto the right card for user input

// was lazy and just hid the fields until clicked
function loadRight() {
    rightBar.innerHTML = "";

    //adds the animation delay in dynamically so as to not have to bind an id to this just for that 
    let animateDelay = 1350;

    const newSoundDiv = createDivs();
    newSoundDiv.style = `animation-delay: ${animateDelay}ms`;
    newSoundDiv.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit">Toggle Sound</button>`;
    newSoundDiv.addEventListener("click", function () {
        if(isPlaying){
            isPlaying = false;
        }
        else{
            isPlaying = true;
        }
    })
    animateDelay -= 150;
    rightBar.prepend(newSoundDiv);


    const newKillDiv = createDivs();
    newKillDiv.style = `animation-delay: ${animateDelay}ms`;
    newKillDiv.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit">Delete Random Marker's</button>`;
    newKillDiv.addEventListener("click", function () {
        killRandom();
    })
    animateDelay -= 150;
    rightBar.prepend(newKillDiv);

    const newMarkerDiv = createDivs();
    newMarkerDiv.style = `animation-delay: ${animateDelay}ms`;
    newMarkerDiv.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit">Create Random Marker</button>`;
    newMarkerDiv.addEventListener("click", function () {
        randomPosition();
    })
    animateDelay -= 150;
    rightBar.prepend(newMarkerDiv);

    const newPolyColorDiv = createDivs();
    newPolyColorDiv.style = `animation-delay: ${animateDelay}ms`;
    newPolyColorDiv.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit" style="background: ${polylineColor}">Toggle Polyline Color</button>`;
    newPolyColorDiv.addEventListener("click", function () {
        reColorPolyline();
        let color = "white"
        console.log(polylineColor)
        if (polylineColor === "#FFFFFF") {
            color = "black";
        } else if (polylineColor === "#C0C0C0") {
            color = "black";
        } else if (polylineColor === "orange") {
            color = "black";
        }
        createPolyLine();
        this.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit" style="background: ${polylineColor}; color: ${color}">Toggle Polyline Color</button>`;
    })
    animateDelay -= 150;
    rightBar.prepend(newPolyColorDiv);


    const newToggleDiv = createDivs();
    newToggleDiv.style = `animation-delay: ${animateDelay}ms`;
    newToggleDiv.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit">Toggle Polyline: OFF</button>`;
    newToggleDiv.addEventListener("click", function () {
        if (isEnabled === true) {
            this.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit">Toggle Polyline: ON</button>`;
            isEnabled = false;
            createPolyLine();
        } else {
            this.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit">Toggle Polyline: OFF</button>`;
            isEnabled = true;
            createPolyLine();
        }
    })
    animateDelay -= 150;
    rightBar.prepend(newToggleDiv);

    //create an input field and add it to the top of the right bar 
    const newInputDiv = createDivs();
    newInputDiv.id = "textBoxField";
    newInputDiv.style = `animation-delay: ${animateDelay}ms`;
    newInputDiv.innerHTML = `<input id="toggledField" type="text" value="${city_cords_global.city}" name="inputValue">`;

    animateDelay -= 150;
    rightBar.prepend(newInputDiv);


    const newButton = createDivs();
    // button that is used as input for new city data point
    newButton.innerHTML = `<button id="inputButton" type="submit" value="Click Me" name="submit">ENTER NEW CITY</button>`;

    newButton.style = `animation-delay: ${animateDelay}ms`;
    animateDelay -= 150;

    newButton.addEventListener("click", function () {
        const cityInput = document.getElementById("toggledField");
        if (typeof cityInput.value === "string" && cityInput.value !== "") {
            city_cords_global.city = cityInput.value;
            codeAddress();
        } else {
            if(cityInput.value === ""){
                createDisplayModal("ERROR: nothing entered, please enter something and try again")
                cityInput.value = "nothing entered!";
            } else {
                createDisplayModal("ERROR: what you entered is not a string!")
                cityInput.value = "Value is not a string!";
            }
        }
    })
    newButton.style = `animation-delay: ${animateDelay}ms`;
    animateDelay -= 150;
    rightBar.prepend(newButton);
    // creates button that allows to toggle the display all funtion of data points
    const secondButton = createDivs();

    secondButton.innerHTML = `<button id="allDataPoints" type="submit" value="All ISS Positions" name="ALL DATA POINTS">ALL ISS DATA POINTS</button>`
    secondButton.style = `animation-delay: ${animateDelay}ms`;
    animateDelay -= 150;

    rightBar.prepend(secondButton)
    secondButton.addEventListener("click", () => {

        if (shown === false) {
            last100();
            shown = true;
        } else {
            toggle();
            shown = false;
        }
    })
}

//this function exists to create div's for the right sidebar and add a preset class list
function createDivs() {
    const newDiv = document.createElement("div");
    newDiv.classList = "animated fadeInRightBig testFields";
    return newDiv;
}


//intended to display sort of a console-esk log of previous coordinates every 30 seconds if the interval is running 
function displayRightBarData() {
    if (rightBarDataGlobal.isRunning === false) {
        rightBarDataGlobal.timerInterval = setInterval(() => {
            createRightConsoleData();
        }, 30000);
        //wait 2 seconds after function called to display data because it looks cooler

        setTimeout(createRightConsoleData, 1000)

        //set is running let to true so we can identify if the interval is running or not
        rightBarDataGlobal.isRunning = true;
    } else {
        //clear the interval so to not mess wit the menu when open
        clearTimeout(rightBarDataGlobal.timerInterval)
        //set is running var to false so we can identify if the interval is running or not
        rightBarDataGlobal.isRunning = false
    }
}

let pointArr = [];

//this creates the "Console like" elements in the right bar using the data stored in local forage
function createRightConsoleData() {
    //query local forage for the issArray array
    localforage.getItem("issArray").then(function (results) {
        let issData = results || [];

        //if the array is not empty do things
        if (issData.length !== 0) {

            //check if previous data is displayed
            let previousConsoleData = document.getElementsByClassName("consoleData");

            //if not then try to make some exist in a reverse for loop counting down from 10
            if (previousConsoleData.length === 0) {
                for (let i = 10; i >= 0; i--) {
                    //if issData with the index of i exists then put it on the page
                    if (issData[i] !== undefined) {
                        //create a div for it add consoleData to the classList so to be identified
                        let newDiv = createDivs()
                        newDiv.classList.add("consoleData");


                        //set the id of the new div to the longitude coordinate and set the innerHTML to the data
                        newDiv.id = `${issData[i].lon}`;

                        //this binds the entire object stringified to the div
                        newDiv.setAttribute("rawData", JSON.stringify(issData[i]));
                        newDiv.setAttribute("arrId", "null");

                        newDiv.innerHTML = `<p style="font-size: 14px">lat: ${issData[i].lat}<br/>lon: ${issData[i].lon}<br/>timeStamp: ${issData[i].time}<br/>distance from ${issData[i].cityData.city}: ${issData[i].distance}</p>`;

                        // this click function is going to grab the data from the right bar and let the user get previous data sets from the ISS
                        newDiv.addEventListener('click', () => {
                            let arrID = newDiv.getAttribute("arrId");
                            let newData = newDiv.getAttribute("rawData");
                            let clickedData = JSON.parse(newData);
                            let mapDotRed = mapDot;
                            mapDotRed.fillColor = "red";

                            if (arrID === "null") {
                                createOLDMarker(clickedData, mapDotRed, newDiv);
                            } else {
                                arrID = parseInt(arrID);
                                let dataMarker = pointArr[arrID];
                                if (dataMarker === undefined) {
                                    createOLDMarker(clickedData, mapDotRed, newDiv);
                                    return
                                }
                                dataMarker.setMap(null);
                                newDiv.setAttribute("arrId", "null");
                                pointArr[arrID] = undefined;
                            }
                        })
                        rightBar.prepend(newDiv);

                        // if (shown === false) {
                        // selectData();
                        //     shown = true;
                        // } else {
                        //     smallToggle();
                        //     shown = false;
                        // }
                    }
                }
            } else {

                //if  then try to make some exist in a reverse for loop counting down from 10
                for (let i = 10; i >= 0; i--) {
                    let existing;
                    if (issData[i] !== undefined) existing = document.getElementById(`${issData[i].lon}`);
                    // console.log(existing);
                    if (existing === null && issData[i] !== undefined) {
                        //create a div for it add consoleData to the classList so to be identified
                        let newDiv = createDivs()
                        newDiv.classList.add("consoleData");

                        //set the id of the new div to the longitude coordinate and set the innerHTML to the data
                        newDiv.id = `${issData[i].lon}`;

                        //this binds the entire object stringified to the div
                        newDiv.setAttribute("rawdata", JSON.stringify(issData[i]));
                        newDiv.setAttribute("arrId", "null");

                        newDiv.innerHTML = `<p style="font-size: 14px">lat: ${issData[i].lat}<br/>lon: ${issData[i].lon}<br/>timeStamp: ${issData[i].time}<br/>distance from ${issData[i].cityData.city}: ${issData[i].distance}</p>`;

                        // this click function is going to grab the data from the right bar and let the user get previous data sets from the ISS
                        newDiv.addEventListener('click', () => {
                            let arrID = newDiv.getAttribute("arrId");
                            let newData = newDiv.getAttribute("rawData");
                            let clickedData = JSON.parse(newData);
                            let mapDotRed = mapDot;
                            mapDotRed.fillColor = "red";

                            if (arrID === "null") {
                                createOLDMarker(clickedData, mapDotRed, newDiv)
                            } else {
                                arrID = parseInt(arrID);
                                let dataMarker = pointArr[arrID];
                                if (dataMarker === undefined) {
                                    createOLDMarker(clickedData, mapDotRed, newDiv);
                                    return
                                }
                                dataMarker.setMap(null);
                                newDiv.setAttribute("arrId", "null");
                                pointArr[arrID] = undefined;
                            }
                        })
                        rightBar.prepend(newDiv);

                        ;

                    }
                }

            }
        }
    })
}

function createOLDMarker(clickedData, mapDotRed, newDiv) {
    let dataMarker = new google.maps.Marker({
        position: new google.maps.LatLng(clickedData.lat, clickedData.lon),
        map: map,
        icon: mapDotRed,
        title: clickedData.time,
        optimized: false
    })
    pointArr.push(dataMarker);
    let arrayID = pointArr.length - 1;
    newDiv.setAttribute("arrId", `${arrayID}`);
}


// our weather API
function getWeather() {
    // instead of trying to get the iss data from iss loop itself, I grabbed it from the latest local forage push
    localforage.getItem("issArray").then(function (results) {
        if (results === null) return;
        let forageLat = results[0].lat;
        let forageLon = results[0].lon;
        let weatherAPI = "https://api.openweathermap.org/data/2.5/weather?lat=" + forageLat + "&lon=" + forageLon + "&units=imperial&appid=0ce03d42e54802b6dbe51878757418ee";

        fetch(weatherAPI).then(response => {
                return response.json();
            })
            .then(responseJson => {
                // console.log(responseJson);
                // grabs the response and appends the html every 30 seconds with the weather data for that specific location
                document.getElementById("currentIssWeatherTemp").innerHTML = responseJson.main.temp + " Degrees F";
                document.getElementById("currentIssWeatherHum").innerHTML = "Humidity: " + responseJson.main.humidity;
                document.getElementById("currentIssWeatherRain").innerHTML = responseJson.weather[0].description;
                document.getElementById("currentIssWeatherWind").innerHTML = "Wind: " + responseJson.wind.speed + " MPH";

            })
    })

}
// calls the weather function to generate it and then sets the 30 second interval that matches the rest of the main intervals for this app
getWeather();
setInterval(() => {
    getWeather();
}, 30000);

(function () {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
    window.requestAnimationFrame = requestAnimationFrame;
})();

// Terrain stuff.
var background = document.getElementById("bgCanvas"),
    bgCtx = background.getContext("2d"),
    width = window.innerWidth,
    height = document.body.offsetHeight;

(height < 400) ? height = 400: height;

background.width = width;
background.height = height;


// Second canvas used for the stars
bgCtx.fillStyle = '#05004c';
bgCtx.fillRect(0, 0, width, height);

// stars
function Star(options) {
    this.size = Math.random() * 2;
    this.speed = Math.random() * .05;
    this.x = options.x;
    this.y = options.y;
}

Star.prototype.reset = function () {
    this.size = Math.random() * 2;
    this.speed = Math.random() * .05;
    this.x = width;
    this.y = Math.random() * height;
}

Star.prototype.update = function () {
    this.x -= this.speed;
    if (this.x < 0) {
        this.reset();
    } else {
        bgCtx.fillRect(this.x, this.y, this.size, this.size);
    }
}

function ShootingStar() {
    this.reset();
}

ShootingStar.prototype.reset = function () {
    this.x = Math.random() * width;
    this.y = 0;
    this.len = (Math.random() * 80) + 10;
    this.speed = (Math.random() * 10) + 6;
    this.size = (Math.random() * 1) + 0.1;
    // this is used so the shooting stars aren't constant
    this.waitTime = new Date().getTime() + (Math.random() * 3000) + 500;
    this.active = false;
}

ShootingStar.prototype.update = function () {
    if (this.active) {
        this.x -= this.speed;
        this.y += this.speed;
        if (this.x < 0 || this.y >= height) {
            this.reset();
        } else {
            bgCtx.lineWidth = this.size;
            bgCtx.beginPath();
            bgCtx.moveTo(this.x, this.y);
            bgCtx.lineTo(this.x + this.len, this.y - this.len);
            bgCtx.stroke();
        }
    } else {
        if (this.waitTime < new Date().getTime()) {
            this.active = true;
        }
    }
}

var entities = [];

// init the stars
for (var i = 0; i < height; i++) {
    entities.push(new Star({
        x: Math.random() * width,
        y: Math.random() * height
    }));
}

// Add 2 shooting stars that just cycle.
entities.push(new ShootingStar());
entities.push(new ShootingStar());


//animate background
function animate() {
    bgCtx.fillStyle = '#110E19';
    bgCtx.fillRect(0, 0, width, height);
    bgCtx.fillStyle = '#ffffff';
    bgCtx.strokeStyle = '#ffffff';

    var entLen = entities.length;

    while (entLen--) {
        entities[entLen].update();
    }
    requestAnimationFrame(animate);
}
animate();
console.log()

let wooooooo = [];

// pulls from localForage all the saved data points and maps them accros the map with time stamp. 
function last100() {
    localforage.getItem("issArray").then(function (results) {
        killOldData();
        killRandom();
        let mapDotRed = mapDot;
        mapDotRed.fillColor = "red";
        for (let i = 0; i < results.length; i++) {

            let forageMarker = new google.maps.Marker({
                position: new google.maps.LatLng(results[i].lat, results[i].lon),
                map: map,
                icon: mapDotRed,
                title: results[i].time,
                optimized: false
            })
            wooooooo.push(forageMarker);
        }

    })
}
// toggle funtion that removes the dots when called

function toggle() {
    for (let i = 0; i < wooooooo.length; i++) {
        wooooooo[i].setMap(null);
    }
}
//not very dry but hey it works and we're pushing lots of code
function smallToggle() {
    for (let i = 0; i < moreWooo.length; i++) {
        moreWooo[i].setMap(null);
    }
}
// creates a popup if an error is thrown at us with user input
function createDisplayModal(displayString) {
    let modal = document.getElementById("myErrModal");
    let modalText = document.getElementById("modal-text");
    modal.style.display = "block";
    window.addEventListener("click", function (event) {
        if (event.target === modal) {
            modal.style.display = "none"
        }
    })
    modalText.textContent = displayString;
}
// gets rid of old data 
function killOldData() {
    for (let i = 0; i < pointArr.length; i++) {
        const element = pointArr[i];
        if (element !== undefined) {
            element.setMap(null);
        }
    }
    pointArr = [];
}

// polyline color
function reColorPolyline() {
    if (polylineColor === "red") {
        polylineColor = "blue";
    } else if (polylineColor === "blue") {
        polylineColor = "green";
    } else if (polylineColor === "green") {
        polylineColor = "black";
    } else if (polylineColor === "black") {
        polylineColor = "orange";
    } else if (polylineColor === "orange") {
        polylineColor = "#FFFFFF";
    } else if (polylineColor === "#FFFFFF") {
        polylineColor = "#C0C0C0";
    } else if (polylineColor === "#C0C0C0") {
        polylineColor = "red";
    }
}


let randomPositionGen = [];

// randomPosition();
function randomPosition() {
    let randomColor = "#000000".replace(/0/g, function () {
        return (~~(Math.random() * 16)).toString(16);
    });
    let mapDotRed = mapDot;
    mapDotRed.fillColor = randomColor;
    

    let numLon = (Math.random() * 180).toFixed(3);
    let pOrNeg = Math.floor(Math.random());
    if (pOrNeg == 0) {
        numLon = numLon * -1;
    }

    let numLat = (Math.random() * 90).toFixed(3);
    let posorneg = Math.floor(Math.random());
    if (posorneg == 0) {
        numLat = numLat * -1;
    }

    let randomMarker = new google.maps.Marker({
        position: new google.maps.LatLng(numLat, numLon),
        map: map,
        icon: mapDotRed,
        title: `${numLat}, ${numLon}`,
        optimized: false
    })
    randomPositionGen.push(randomMarker);
    console.log(numLat);
    console.log(numLon);
}

// gets rid of random position 
function killRandom() {
    for (let i = 0; i < randomPositionGen.length; i++) {
        randomPositionGen[i].setMap(null);
    }
}

