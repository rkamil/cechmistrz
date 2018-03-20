var EventEmitter = require('events');
var Velocity = require('velocity-animate');
var util = require('util');
var objects = require('./../data/objects.json');


function Map() {
    this.el = null;
    this.data = {};
    this.dataUrl = 'http://127.0.0.1:1234/';

    EventEmitter.call(this);
}

util.inherits(Map, EventEmitter);

// podpięcie mapy do elementu DOM
Map.prototype.attachElement = function (el) {
    this.el = el;
}

// wczytanie mapy
Map.prototype.load = function (name) {
    // wyznaczenie adresu url danych mapy
    var url = this.dataUrl + '?map=' + encodeURIComponent(name);

    // wyczyszczenie aktualnej mapy
    this.clear();

    // pobranie danych mapy
    fetch(url, {}).then(function (response) {
        return response.json();
    }).then(function (json) {
        this.data = json;
        this.emit('loaded', this.data);
    }.bind(this));
}

// wyświetlenie mapy
Map.prototype.render = function () {
    var mapObjects = this.data.objects;
    
    for (var i = 0, len = mapObjects.length; i < len; i++) {

        if (mapObjects[i] == 0)
            continue;
        
        var objectData = objects[mapObjects[i]],
            y = Math.floor(i / this.data.width),
            x = i - (y * this.data.width);

        var zIndex = 100 + y * 2;
        x *= 32;
        y *= 32;
        
        // uwzględnienie pozycji środka
        var endX = x - objectData['center-x'],
            endY = y - objectData['center-y'];

        // utworzenie i dodanie nowego obiektu
        var newEl = document.createElement('div');

        newEl.classList.add('map_object');
        
        newEl.style.width = objectData.width + 'px';
        newEl.style.height = objectData.height + 'px';
        newEl.style.backgroundImage = 'url(' + objectData.image + ')';

        if (objectData['flat'])
            newEl.style.zIndex = 50;
        else
            newEl.style.zIndex = zIndex;

        newEl.style.left = endX + 'px';
        newEl.style.top = endY + 'px';

        this.el.appendChild(newEl);
    }
}

// wyczyszczenie mapy
Map.prototype.clear = function () {
    this.el.innerHTML = '';

    var playerEl = document.createElement('div');
    playerEl.classList.add('player');
    playerEl.id = 'player';

    this.el.appendChild(playerEl);
}

// sprawdzenie kolizji
Map.prototype.isWalkable = function (x, y) {
    // obrzeża mapy
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height)
    return false;

    // wskazana pozycja
    var index = y * this.data.width + x,
        objectId = this.data.objects[index];

    if (objectId == 0)
        return true;

    if (objects[objectId].collidable)
        return false;

    return true;
}

// przewijanie mapy
Map.prototype.scrollTo = function (x, y) {
    // rozmiar widzialnego obszaru
    var cameraWidth = 896/32, 
        cameraHeight = 640/32;

    // ograniczenie zakresu kamery
    if (x < 0)
        x = 0;

    if (y < 0)
        y = 0;

    if (x + cameraWidth >= this.data.width)
        x = this.data.width - cameraWidth;

    if (y + cameraHeight >= this.data.height)
        y = this.data.height - cameraHeight;

    // ustawienie kamery
    var pixelsX = - x * 32,
        pixelsY = - y * 32;

    Velocity(this.el, {
        left: pixelsX + 'px',
        top: pixelsY + 'px'
    }, {duration: 250, easing: 'linear'});
}




// utworzenie obiektu mapy
var map = new Map();

// podpięcie zdarzeń
map.on('loaded', function (data) {
    this.render();
    this.emit('ready');
});

// wyexportowanie
module.exports = map;