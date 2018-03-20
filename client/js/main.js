var Velocity = require('velocity-animate');
var objects = require('./../data/objects.json');
var map = require('./map.js');



// -----------------------------
// OBIEKTY I DANE POTRZEBNE GRZE
// -----------------------------

// dane połączenia z serwerem
var server = {
    url: 'ws://ws.cechmistrz.usermd.net',
    dataUrl: 'http://http.cechmistrz.usermd.net/',
    connection: null
};

// gra
var game = {
    animationId: null,
    loaded: false
};

// mapa
var mapData = {};

// element na którym mapa będzie renderowana
var mapElement = document.getElementById('map');

// kamera
var camera = {x: 0, y: 0, width: 896/32, height: 640/32};

// gracz
var player = {
    x: 0, 
    y: 0, 
    location: null,
    el: document.getElementById('player'), 
    locked: false,
    moveEnded: false,
    moveAccepted: false,
    newData: null
};

// czat
var chat = {
    el: document.getElementById('chat-messages'),
    input: document.getElementById('chat-input')
};

// klawisze
var input = {
    left: false,
    right: false,
    up: false,
    down: false
};




// ---------------------------
// PRZYGOTOWANIE ELEMENTÓW GRY
// ---------------------------

// przygotowanie okna gry
function prepareGame() {
    document.getElementById('game').style.display = 'block';
    document.getElementById('panel').style.display = 'block';
    document.getElementById('loading').style.display = 'none';
}

// przygotowanie mapy do wyświetlenia
function prepareMap() {
    var width = mapData.width * 32,
        height = mapData.height * 32,
        groundSrc = mapData.ground;

    mapElement.style.position = 'absolute';
    mapElement.style.width = width + 'px';
    mapElement.style.height = height + 'px';
    mapElement.style.backgroundImage = 'url(' + groundSrc + ')';

    setCamera(0, 0);
}

// aktualizacja interfejsu
function updateUI() {

    // wyświetlenie nicku
    document.getElementById('nick').innerText = player.nick;

    // wyświetlenie pozycji
    document.getElementById('position').innerText = player.location + ' (' + player.x + ',' + player.y + ')';
    
}




// ---------------
// POWIĄZANE Z GRĄ
// ---------------

// ustawienie kamery
function setCamera(x, y) {
    // ograniczenie zakresu kamery
    if (x < 0)
        x = 0;

    if (y < 0)
        y = 0;

    if (x + camera.width >= mapData.width)
        x = mapData.width - camera.width;

    if (y + camera.height >= mapData.height)
        y = mapData.height - camera.height;
    
    // ustawienie kamery
    var pixelsX = - x * 32,
        pixelsY = - y * 32;

    camera.x = x;
    camera.y = y;

    Velocity(mapElement, {
        left: pixelsX + 'px',
        top: pixelsY + 'px'
    }, {duration: 250, easing: 'linear'});
}

// wczytanie mapy
function loadMap(name, cb) {
    var url = server.dataUrl + '?map=' + encodeURIComponent(name);

    fetch(url).then(function (response) {
        return response.json();
    }).then(function (json) {
        mapData = json;
        cb(json);
    });
}

// wyświetlenie mapy
function loadObjects() {
    var mapObjects = mapData.objects;
    var mapGates = mapData.gates;

    // wyświetlenie obiektów
    for (var i = 0, len = mapObjects.length; i < len; i++) {

        if (mapObjects[i] == 0)
            continue;
        
        var objectData = objects[mapObjects[i]],
            y = Math.floor(i / mapData.width),
            x = i - (y * mapData.width);

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

        mapElement.appendChild(newEl);
    }

    // wyświetlenie przejść
    for (var i = 0, len = mapGates.length; i < len; i++) {
        var x = mapGates[i][0],
            y = mapGates[i][1],
            target = mapGates[i][2];

        var endX = x * 32,
            endY = y * 32;

        var newEl = document.createElement('div');
        newEl.title = target;

        newEl.classList.add('gate');

        newEl.style.left = endX + 'px';
        newEl.style.top = endY + 'px';

        mapElement.appendChild(newEl);
    }

}




// ------------------
// OPERACJE NA GRACZU
// ------------------

// aktualizacja gracza
function updatePlayer() {
    // ustawienie pozycji
    var endX = player.x * 32,
        endY = player.y * 32;

    player.el.style.zIndex = 100 + (player.y * 2) + 1;
    
    // animowanie ruchu
    Velocity(player.el, "stop");
    Velocity(player.el, {
        left: endX + 'px',
        top: endY + 'px'
    }, {
        duration: 250,
        easing: 'linear',
        complete: function () {
            player.moveEnded = true;
            acceptMove(player.newData);
        }
    });

    // ustawienie kamery
    var cameraX = player.x - 14,
        cameraY = player.y - 10;

    setCamera(cameraX, cameraY);
}

// sprawdzenie kolizji
function canMove(x, y) {
    // obrzeża mapy
    if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height)
        return false;

    // wskazana pozycja
    var index = y * mapData.width + x,
        objectId = mapData.objects[index];

    if (objectId == 0)
        return true;

    if (objects[objectId].collidable)
        return false;

    return true;
}

// przejście przez przejście
function enterGate() {
    var mapGates = mapData.gates;

    for (var i = 0, len = mapGates.length; i < len; i++) {
        var x = mapGates[i][0],
            y = mapGates[i][1],
            target = mapGates[i][2];

        if (x == player.x && y == player.y) {

            //alert('Jesteś na przejściu do: ' + target);

            var data = [];

            sendMsg('enterGate', data);
        }
    }
}

// pobranie pozycji kierunku
function getDirectionPosition(dir) {
    var position = {x: player.x, y: player.y};

    if (dir == 'left')
        position.x--;
    if (dir == 'right')
        position.x++;
    if (dir == 'up')
        position.y--;
    if (dir == 'down')
        position.y++;

    return position;
}

// poruszanie gracza
function move(dir) {
    var targetPos = getDirectionPosition(dir);

    // czy gracz nie jest już w ruchu?
    if (player.locked)
        return;

    // czy cel jest osiągalny?
    if (!canMove(targetPos.x, targetPos.y))
        return;

    // wysłanie na serwer informacji o ruchu
    sendMsg('move', {dir: dir});

    // zablokowanie możliwości ruchu i ustawienie nowej pozycji
    player.locked = true;
    player.moveAccepted = false;
    player.moveEnded = false;

    player.x = targetPos.x;
    player.y = targetPos.y;

    // animowanie ruchu
    animateCharacter(player.el, dir);
    updatePlayer();
    

    // odebranie potwierdzenia z serwera, korekcja, odblokowanie możliwości ruchu
}

// animowanie postaci
function animateCharacter(el, dir) {
    var frames = {
        // krok w lewo
        'left1': ['-32px -32px', '0px -32px', '-32px -32px'],
        'left2': ['-32px -32px', '-64px -32px', '-32px -32px'],

        // krok w prawo
        'right1': ['-32px -64px', '0px -64px', '-32px -64px'],
        'right2': ['-32px -64px', '-64px -64px', '-32px -64px'],

        // krok w górę
       'up1': ['-32px -96px', '0px -96px', '-32px -96px'],
       'up2': ['-32px -96px', '-64px -96px', '-32px -96px'],

        // krok w dół
        'down1': ['-32px 0px', '0px -0px', '-32px 0px'],
        'down2': ['-32px 0px', '-64px 0px', '-32px 0px']
    };

    // naprzemienność kroków
    if (el.getAttribute('step') == 'true') {
        dir += '2';
        el.setAttribute('step', 'false');
    } else {
        dir += '1';
        el.setAttribute('step', 'true');
    }

    for (var i = 0; i < 3; i++) {
        (function (frame) {
            setTimeout(function () {
                el.style.backgroundPosition = frames[dir][frame];
            }, frame * 125);
        })(i);
    }
}

// akceptacja ruchu
function acceptMove(data) {
    if (!(player.moveAccepted && player.moveEnded))
        return;

    // ewentualna korekcja pozycji gracza
    player.x = data.player.x;
    player.y = data.player.y;

    // odblokowanie gracza
    player.locked = false;

    // aktualizacja interfejsu
    updateUI();
}




// -----------
// INNI GRACZE
// -----------

// dodanie innego gracza
function newOther(data) {
    var newEl = document.createElement('div'),
        endX = data.x * 32,
        endY = data.y * 32,
        id = data.nick;

    newEl.id = id;
    newEl.title = data.nick;
    newEl.classList.add('other');

    newEl.style.left = endX + 'px';
    newEl.style.top = endY + 'px';

    mapElement.appendChild(newEl);
}

// usunięcie innego gracza
function removeOther(data) {
    var otherEl = document.getElementById(data.nick);
    mapElement.removeChild(otherEl);
}

// aktualizacja innego gracza
function updateOther(data) {
    var otherEl = document.getElementById(data.player.nick),
        endX = data.player.x * 32,
        endY = data.player.y * 32;

    Velocity(otherEl, "stop");
    Velocity(otherEl, {
        left: endX + 'px',
        top: endY + 'px'
    }, {
        duration: 250,
        easing: 'linear',
        complete: function () {
        }
    });

    animateCharacter(otherEl, data.dir);
}




// ----
// CZAT
// ----

// odebranie nowej wiadomości
function newMessage(data) {
    var nick = data.nick,
        msg = data.message;

    var newEl = document.createElement('div');
    
    newEl.classList.add('chat-message');
    newEl.innerHTML = '<span class="chat-nick">' + nick + '</span><span class="chat-txt">' + msg + '</span>';

    chat.el.appendChild(newEl);

    chat.el.scrollTop = chat.el.scrollHeight;
}

// utworzenie wiadomości przygotowanej do wysłania
function createMessage() {
    var msg = chat.input.value;

    chat.input.value = '';
    chat.input.blur();

    return {
        message: msg
    };
}




// ---------------
// OBSŁUGA ZDARZEŃ 
// ---------------

// wciśnięcie przycisków
document.addEventListener('keydown', function (e) {

    // wysłanie wiadomości
    if (e.which == 13 && e.target.tagName == 'INPUT') {

        if (chat.input.value == '')
            return chat.input.blur();

        var msg = createMessage();
        sendMsg('newMessage', msg);
    }
    

    // aktywacja trybu pisania na czacie
    if (e.which == 13 && e.target.tagName != 'INPUT')
        chat.input.focus();

    // zapobiegnięcie aktywacji pozostałych akcji podczas pisania
    if (e.target.tagName == 'INPUT')
        return;

    // w lewo
    if (e.which == 65 || e.which == 37)
        input.left = true;

    // w prawo
    if (e.which == 68 || e.which == 39)
        input.right = true;
    
    // w górę
    if (e.which == 87 || e.which == 38)
        input.up = true;

    // w dół
    if (e.which == 83 || e.which == 40)
        input.down = true;
});

// zwolnienie przycisków
document.addEventListener('keyup', function (e) {
    // zapobiegnięcie aktywacji podczas pisania
    if (e.target.tagName == 'INPUT')
        return;

    // w lewo
    if (e.which == 65 || e.which == 37)
        input.left = false;

    // w prawo
    if (e.which == 68 || e.which == 39)
        input.right = false;
    
    // w górę
    if (e.which == 87 || e.which == 38)
        input.up = false;

    // w dół
    if (e.which == 83 || e.which == 40)
        input.down = false;
});

// utrata focusa na oknie gry
window.onblur = function (e) {
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
}

// aktywacja przejścia
player.el.addEventListener('click', function (e) {
    enterGate();
})

// pętla obsługująca zdarzenia
function updateInput() {
    if (!game.loaded)
        return requestAnimationFrame(updateInput);

    if (input.left)
        move('left');

    if (input.right)
        move('right');

    if (input.up)
        move('up');

    if (input.down)
        move('down');

    requestAnimationFrame(updateInput);
}

game.animationId = requestAnimationFrame(updateInput);




// ----------------------
// KOMUNIKACJA Z SERWEREM
// ----------------------

// utworzenie połączenia
function connect() {
    // połączenie z serwerem
    var ws = new WebSocket(server.url);

    // podpięcie zdarzeń
    ws.onopen = onConnect;
    ws.onclose = onDisconnect;
    ws.onerror = onError;
    ws.onmessage = onMsg;

    // udostępnienie obiektów na zewnątrz
    server.connection = ws;
    window.ws = server.connection;
    window.send = sendMsg;
}

// wysłanie wiadomości
function sendMsg(type, data) {
    var packet = {
        type: type,
        data: data
    };

    var msg = JSON.stringify(packet);
    server.connection.send(msg);

    //console.log('Wysyłanie wiadomości: ' + msg);
}

// callback nawiązania połączenia
function onConnect() {
    console.log('Połączono z serwerem...');
    startGame();
}

// callback utraty połączenia
function onDisconnect() {
    console.log('Rozłączono z serwerem...');
    stopGame();
}

// callback wystąpienia błędu
function onError(error) {
    console.log(error);
    stopGame();
}

// callback odebrania wiadomości
function onMsg(e) {
    var data = JSON.parse(e.data),
        type = data.type,
        data = data.data;

    if (type == 'initial') {
        // ustawienie danych gracza
        player.nick = data.player.nick;
        player.location = data.player.location;
        player.x = data.player.x;
        player.y = data.player.y;

        localStorage.setItem('playerId', data.player.id);
        updateUI();

        // wczytanie mapy
        loadMap(player.location, function (data) {
            prepareMap();
            loadObjects();
            updatePlayer();

            game.loaded = true;
        });

        // ustawienie innych graczy
        var others = data.others;
        
        for (var i = 0; i < others.length; i++) 
            newOther(others[i]);
    }

    if (type == 'move') {
        player.moveAccepted = true;
        player.newData = data;
        acceptMove(player.newData);
    }

    if (type == 'newOther') {
        newOther(data);
    }

    if (type == 'updateOther') {
        updateOther(data);
    }

    if (type == 'removeOther') {
        removeOther(data);
    }

    if (type == 'newMessage') {
        newMessage(data);
    }

    if (type == 'enterGate') {
        if (data.success == true)
            location.reload();
    }
}




// --------
// STAN GRY
// --------

// uruchomienie gry
function startGame() {

    // przygotowanie elementów gry
    prepareGame();
    //prepareMap();

    // wczytanie obiektów
    // loadObjects();

    // wysłanie pakietu startowego
    var playerId = localStorage.getItem('playerId');
    var data = {
        id: playerId
    };

    sendMsg('initial', data);
}

// wstrzymanie gry przy utracie łączności z serwerem
function stopGame() {
    console.log('Gra zatrzymana...');

    // odpięcie zdarzeń
    cancelAnimationFrame(game.animationId);

    // ekran rozłączenia
    document.getElementById('loading').style.display = 'none';
    document.getElementById('game').style.display = 'none';
    document.getElementById('panel').style.display = 'none';
    document.getElementById('disconnected').style.display = 'block';
}

// start aplikacji
connect();
