const canvas = document.querySelector('canvas');
const newCustomButton = document.getElementById('newCustomButton');
const newCustom = document.getElementById('newCustom');
const planetListButton = document.getElementById('planetListButton');
const planetList = document.getElementById('planetList');
const newPresetButton = document.getElementById('newPresetButton');
const newPreset = document.getElementById('newPreset');
const planetNames = document.getElementById('planetNames');
const info = document.getElementById('info');
const spawnPlanetButton = document.getElementById('spawnPlanet');
const settings = document.getElementById('settings');
const settingsButton = document.getElementById('settingsButton');
const orbitSelection = document.getElementById('orbitSelection');
const timeRange = document.getElementById('timeRange');

const planetName = document.getElementById("planetName");
const planetMass = document.getElementById("planetMass");
const planetRadius = document.getElementById("planetRadius");
const planetDistance = document.getElementById("planetDistance");
const planetColor = document.getElementById("planetColor");
const orbitTarget = document.getElementById("orbitTarget");

const DISTANCE_SCALE = 1 / 1000000; // km -> pixels
const SIZE_SCALE = 0.00003;
const G = 6.67430e-20;
let TIME_STEP = timeRange.value; // 1 simulation hour per frame
timeRange.addEventListener("input", () => {

    let value = Number(timeRange.value);

    value = Math.min(Math.max(value, 1), 315360000);

    TIME_STEP = value;

});

let planetPresets = {};
fetch("planets.json")
    .then(response => response.json())
    .then(data => {
        planetPresets = data;
        createPresetButtons();
    });

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);

let camera = {
    x: 0,
    y: 0,
    zoom: 1,
    targetX: 0,
    targetY: 0,
    targetZoom: 1
};

function updateCamera(){

    const smoothness = 0.05;

    if (selectedBody) {
        camera.targetX = selectedBody.x;
        camera.targetY = selectedBody.y;
    }

    camera.x += (camera.targetX - camera.x) * smoothness;
    camera.y += (camera.targetY - camera.y) * smoothness;

    camera.zoom += (camera.targetZoom - camera.zoom) * smoothness;
}

const c = canvas.getContext('2d');

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener("mousedown", (e) => {
    dragging = true;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    // Stop following the selected planet while dragging
    selectedBody = null;
    info.style.display = "none";
});

canvas.addEventListener("mousemove", (e) => {

    if (!dragging) return;

    let dx = e.clientX - lastMouseX;
    let dy = e.clientY - lastMouseY;

    camera.targetX -= dx / (DISTANCE_SCALE * camera.zoom);
    camera.targetY -= dy / (DISTANCE_SCALE * camera.zoom);

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener("mouseup", () => {
    dragging = false;
});

canvas.addEventListener("mouseleave", () => {
    dragging = false;
});

let bodies = [];
let selectedBody = null;
let showOrbits = orbitSelection.value === "show";
orbitSelection.addEventListener("change", () => {
    showOrbits = orbitSelection.value === "show";
});

class Body {
    constructor(name, x, y, vx, vy, radius, mass, color, fixed = false) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.mass = mass;
        this.color = color;
        this.ax = 0;
        this.ay = 0;
        this.fixed = fixed;
        this.orbitTarget = null;
    }

    draw() {
        this.drawOrbit();
        if (this === selectedBody) {
            c.shadowColor = "white";
            if (selectedBody.radius < 100000){
                c.shadowBlur = 10;
            }
            else{
                c.shadowBlur = 25;
            }
        }
        else {
            c.shadowBlur = 0;
        }
        c.beginPath();
        c.arc(
            canvas.width / 2 + (this.x - camera.x) * DISTANCE_SCALE * camera.zoom,
            canvas.height / 2 + (this.y - camera.y) * DISTANCE_SCALE * camera.zoom,
            Math.max(this.radius * SIZE_SCALE * camera.zoom, 2),
            0,
            Math.PI * 2
        );
        c.fillStyle = this.color;
        c.fill();
        c.closePath();
    }

    drawOrbit(){
        if (!showOrbits) return;
        if (!this.orbitTarget) return;


        let dx = this.x - this.orbitTarget.x;
        let dy = this.y - this.orbitTarget.y;

        let distance = Math.sqrt(
            dx * dx + dy * dy
        );


        let centerX =
            canvas.width / 2 +
            (this.orbitTarget.x - camera.x) *
            DISTANCE_SCALE *
            camera.zoom;


        let centerY =
            canvas.height / 2 +
            (this.orbitTarget.y - camera.y) *
            DISTANCE_SCALE *
            camera.zoom;


        c.beginPath();

        c.arc(
            centerX,
            centerY,
            distance * DISTANCE_SCALE * camera.zoom,
            0,
            Math.PI * 2
        );


        c.strokeStyle = "white";
        c.globalAlpha = 0.4;
        c.stroke();

        c.globalAlpha = 1;
    }

    update(){

        if (!this.fixed) {
            this.vx += this.ax * TIME_STEP;
            this.vy += this.ay * TIME_STEP;

            this.x += this.vx * TIME_STEP;
            this.y += this.vy * TIME_STEP;
        }

        this.draw();
    }
}

function init() {
    bodies = [];

    let sun = new Body(
        "Sun",
        0,
        0,
        0,
        0,
        696340,
        1.989e30,
        "yellow",
        true
    );

    bodies.push(sun);
    updatePlanetList();
    updateOrbitList();
}

let infoTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    c.fillStyle = "rgba(10,10,10,1)";
    c.fillRect(0, 0, canvas.width, canvas.height);

    gravity();
    updateCamera();


    bodies.forEach(body => {
        body.update();
    });

    if (selectedBody) {
        infoTimer++;

        if (infoTimer > 5) {
            updatePlanetStats();
            infoTimer = 0;
        }
    }
}


function updateOrbitList(){

    orbitTarget.innerHTML = "";

    bodies.forEach((body, index)=>{

        let option = document.createElement("option");

        option.value = body.name;
        option.textContent = body.name;

        orbitTarget.appendChild(option);
    });
}

function gravity(){

    for(let i = 0; i < bodies.length; i++){

        let body = bodies[i];

        body.ax = 0;
        body.ay = 0;

        for(let j = 0; j < bodies.length; j++){

            if(i === j) continue;

            let other = bodies[j];

            let dx = other.x - body.x;
            let dy = other.y - body.y;

            let distance = Math.sqrt(dx*dx + dy*dy);

            let force = G * other.mass / (distance * distance);

            body.ax += force * dx / distance;
            body.ay += force * dy / distance;
        }
    }
}

function updatePlanetList(){

    planetNames.innerHTML = "";

    let sortedBodies = [...bodies].sort((a, b) => {

        let distanceA = Math.sqrt(
            a.x * a.x + a.y * a.y
        );

        let distanceB = Math.sqrt(
            b.x * b.x + b.y * b.y
        );

        return distanceA - distanceB;
    });

    sortedBodies.forEach(body => {

        let button = document.createElement("button");

        button.textContent = body.name;

        button.addEventListener("click", () => {

            if (selectedBody === body) {
                selectedBody.orbitPath = [];
                selectedBody = null;
                camera.targetX = 0;
                camera.targetY = 0;
                camera.targetZoom = 1;
            }
            else {
                selectedBody = body;


                if (body.radius < 100000){
                    camera.targetZoom = 100000 / body.radius
                }
                else{
                    camera.targetZoom = Math.min(
                    1000000 / body.radius,
                    20
                    );
                }
            }                      

            updatePlanetInfo();
        });


        planetNames.appendChild(button);

    });
}

function updatePlanetInfo(){

    if (!selectedBody){
        info.style.display = "none";
        return;
    }

    info.style.display = "block";

    let distanceFromParent = "";

    if (selectedBody.orbitTarget) {
        let dx = selectedBody.x - selectedBody.orbitTarget.x;
        let dy = selectedBody.y - selectedBody.orbitTarget.y;

        let distance = Math.sqrt(dx*dx + dy*dy);

        distanceFromParent = `
        Distance from ${selectedBody.orbitTarget.name}:
        <br>
        <span id="distance">${Math.round(distance).toLocaleString()}</span>
        <br><br>`;
    }

    info.innerHTML = `
        <h3>${selectedBody.name}</h3>

        Mass:
        ${selectedBody.mass.toExponential(3)} kg
        <br><br>

        Radius:
        ${selectedBody.radius.toLocaleString()} km
        <br><br>

        ${distanceFromParent}

        Position:
        <br>
        X: <span id="posX"></span> km
        <br>
        Y: <span id="posY"></span> km
        <br><br>

        Velocity:
        <br>
        X: <span id="velX"></span> km/s
        <br>
        Y: <span id="velY"></span> km/s
        <br><br>

        Speed:
        <span id="speed"></span> km/s

        <br><br>

        <button id="delete">Delete</button>
    `;

    const deleteButton = document.getElementById("delete");

    deleteButton.addEventListener("click", () => {

        if (selectedBody.name === "Sun") {
            alert("Cannot delete the Sun!");
            return;
        }

        bodies = bodies.filter(
            body => body !== selectedBody
        );

        selectedBody = null;

        camera.targetX = 0;
        camera.targetY = 0;
        camera.targetZoom = 1;

        info.style.display = "none";

        updatePlanetList();
        updateOrbitList();
    });

    updatePlanetStats();
}

function updatePlanetStats(){

    if (!selectedBody) return;

    document.getElementById("posX").textContent =
        Math.round(selectedBody.x).toLocaleString();

    document.getElementById("posY").textContent =
        Math.round(selectedBody.y).toLocaleString();

    document.getElementById("velX").textContent =
        selectedBody.vx.toFixed(2);

    document.getElementById("velY").textContent =
        selectedBody.vy.toFixed(2);

    document.getElementById("speed").textContent =
        Math.sqrt(
            selectedBody.vx ** 2 +
            selectedBody.vy ** 2
        ).toFixed(2);

    if (selectedBody.orbitTarget){
        let dx = selectedBody.x - selectedBody.orbitTarget.x;
        let dy = selectedBody.y - selectedBody.orbitTarget.y;

        document.getElementById("distance").textContent =
            Math.round(Math.sqrt(dx*dx + dy*dy)).toLocaleString() + " km";
    }
}

init();
animate();

function spawnPlanet(data) {

    // Find orbit target
    let parent = bodies.find(
        body => body.name.toLowerCase() === data.orbit.toLowerCase()
    );

    if (!parent && planetPresets[data.orbit]){
        spawnPlanet(planetPresets[data.orbit]);

        parent = bodies.find(
            body => body.name === data.orbit
        );
    }

    // Default to Sun
    if (!parent) {
        parent = bodies.find(
            body => body.name === "Sun"
        );
    }

    if (!parent) {
        return;
    }

    if (bodies.some(body => body.name.toLowerCase() === data.name.toLowerCase())){
        alert(`${data.name} already exists!`);
        return;
    }

    // Random starting angle
    let angle = Math.random() * Math.PI * 2;

    // Position
    let x = parent.x + Math.cos(angle) * data.distance;
    let y = parent.y + Math.sin(angle) * data.distance;

    // Circular orbit velocity
    let speed = Math.sqrt(
        G * parent.mass / data.distance
    );

    let vx = parent.vx - Math.sin(angle) * speed;
    let vy = parent.vy + Math.cos(angle) * speed;


    let planet = new Body(
        data.name,
        x,
        y,
        vx,
        vy,
        data.radius,
        data.mass,
        data.color
    );

    planet.orbitTarget = parent;

    bodies.push(planet);


    updateOrbitList();
    updatePlanetList();

    console.log("Spawned:", data.name);
}

spawnPlanetButton.addEventListener("click", ()=>{

    spawnPlanet({
        name: planetName.value,
        mass: Number(planetMass.value),
        radius: Number(planetRadius.value),
        distance: Number(planetDistance.value),
        orbit: orbitTarget.value,
        color: planetColor.value
    });

});

function createPresetButtons(){

    const presetList = document.getElementById("presetList");
    presetList.innerHTML = "";

    Object.keys(planetPresets).forEach(name => {
        let button = document.createElement("button");

        button.textContent = name;

        button.addEventListener("click", ()=>{
            spawnPlanet(
                planetPresets[name]
            );
        });

        presetList.appendChild(button);
    });
}

//zoom
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();

    if (event.deltaY < 0) {
        camera.targetZoom *= 1.1; // zoom in
    }
    else {
        camera.targetZoom *= 0.9; // zoom out
    }

    camera.targetZoom = Math.min(
        Math.max(camera.targetZoom, 0.05),
        100
    );

});

function openPanel(panel) {

    let wasOpen = panel.classList.contains("open");

    // close all panels
    newCustom.classList.remove("open");
    planetList.classList.remove("open");
    newPreset.classList.remove("open");
    settings.classList.remove("open");

    // move buttons back
    newCustomButton.classList.remove("open");
    planetListButton.classList.remove("open");
    newPresetButton.classList.remove("open");
    settingsButton.classList.remove("open");

    // if it wasn't already open, open it
    if (!wasOpen) {

        panel.classList.add("open");

        newCustomButton.classList.add("open");
        planetListButton.classList.add("open");
        newPresetButton.classList.add("open");
        settingsButton.classList.add("open");
    }
}

newCustomButton.addEventListener("click", () => {
    openPanel(newCustom, newCustomButton);
});

planetListButton.addEventListener("click", () => {
    openPanel(planetList, planetListButton);
});

newPresetButton.addEventListener("click", () => {
    openPanel(newPreset, newPresetButton);
});
settingsButton.addEventListener("click",()=>{
    openPanel(settings, settingsButton);
})