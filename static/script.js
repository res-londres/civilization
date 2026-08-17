
var socket = io();

// ----------init---------- //
function init() {
    // auth
    checkSession();

    // ui render
    renderResources();

    // event listeners
    setupResourceClickHandlers();
    setupNavigation();
}
document.addEventListener('DOMContentLoaded', init);

// ----------cookie-helpers---------- //
function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    console.log('cookie set:', name, '=', value);
    console.log('all cookies now:', document.cookie);
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) {
            var value = c.substring(nameEQ.length, c.length);
            console.log('cookie found:', name, '=', value);
            return value;
        }
    }
    console.log('cookie not found:', name);
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    console.log('cookie deleted:', name);
}

// ----------socket-stuff---------- //
socket.on('join_success', function(data) {
    if (data.set_cookie) {
        setCookie('player_id', data.full_id, 365);
    }
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'grid';
    displayNameInput.value = '';
    joinButton.disabled = false;
    joinButton.textContent = 'Join World';
    updatePlayerData(data.player);
});
socket.on('join_error', function(data) {
    invalidNameMessage.textContent = 'Please enter a valid alphanumeric name!';
    displayNameInput.focus();
    joinButton.disabled = false;
    joinButton.textContent = 'Join World';
})
socket.on('session_cleared', function(data) {
    if (data && data.clear_cookie) {
        deleteCookie('player_id');
    }
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
});

// -----------auth---------- //
function checkSession() {
    fetch('/check_session')
        .then(response => response.json())
        .then(data => {
            if (data.active) {
                // auto login success
                document.getElementById('login-container').style.display = 'none';
                document.getElementById('game-container').style.display = 'grid';
                updatePlayerData(data.player);
            }
        })
}

// ----------general-stuff---------- //
var displayNameInput = document.getElementById('display-name-input');
var invalidNameMessage = document.getElementById('invalid-name-message');
var joinButton = document.getElementById('join-button');
displayNameInput.addEventListener('input', () => {
    if (displayNameInput.value.length > 0) {
        invalidNameMessage.textContent = '';
    }
});

function joinGame() {
    var displayName = displayNameInput.value.trim();
    if (!displayName) {
        invalidNameMessage.textContent = 'Please enter a valid alphanumeric name!';
        displayNameInput.focus();
        return;
    }
    joinButton.disabled = true;
    joinButton.textContent = 'Connecting...';
    socket.emit('join', {displayName: displayName});
}

function updatePlayerData(player) {
    if (!player) return;
    const parts = player.full_id.split('#');
    const displayName = parts[0];
    const idTag = `#${parts[1]}`;
    document.getElementById('display-name').textContent = displayName || 'somehow_unnamed';
    document.getElementById('id-tag').textContent = idTag || '#12345';
    document.getElementById('efficiency').textContent = (player.efficiency || 0) + '%';
    document.getElementById('mastery').textContent = (player.mastery || 0) + '%';
    document.getElementById('artistry').textContent = player.artistry || 0;
}

function retirePlayer() {
    // temporary 
    if (confirm('Are you sure you want to retire? Your character will be gone forever!')) {
        socket.emit('retire');
    }
}

// ---------nav-page-loader---------- //
function setupNavigation() {
    document.querySelectorAll('nav a').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var page = this.dataset.page;
            showPage(page);
        });
    });
}
function showPage(page) {
    // hide all pages
    document.querySelectorAll('.page-content').forEach(function(el) {
        el.style.display = 'none';
    });
    // show target page
    var target = document.getElementById('page-' + page);
    if (target) {
        target.style.display = 'block';
    }
    // reassign active class to active page
    document.querySelectorAll('nav a').forEach(function(el) {
        el.classList.remove('active');
    });
    document.querySelector('nav a[data-page="' + page + '"]').classList.add('active');
}

// ----------resource-page---------- //
// SAMPLE RESOURCE DATA //
var RESOURCE_DATA = [
    { name: 'wood', displayName: 'Wood', amount: 1000, maxAmount: 1000, recoveryRate: 10.00, gatherers: 0 },
    { name: 'stone', displayName: 'Stone', amount: 800, maxAmount: 1000, recoveryRate: 8.00, gatherers: 0 },
    { name: 'copper', displayName: 'Copper', amount: 500, maxAmount: 800, recoveryRate: 5.00, gatherers: 0 },
    { name: 'tin', displayName: 'Tin', amount: 300, maxAmount: 600, recoveryRate: 4.00, gatherers: 0 },
    { name: 'iron', displayName: 'Iron', amount: 200, maxAmount: 500, recoveryRate: 3.00, gatherers: 0 },
    { name: 'water', displayName: 'Water', amount: 2000, maxAmount: 2500, recoveryRate: 20.00, gatherers: 0 },
    { name: 'herbs', displayName: 'Herbs', amount: 400, maxAmount: 600, recoveryRate: 5.00, gatherers: 0 },
    { name: 'fiber', displayName: 'Fiber', amount: 500, maxAmount: 700, recoveryRate: 6.00, gatherers: 0 },
    { name: 'clay', displayName: 'Clay', amount: 600, maxAmount: 800, recoveryRate: 7.00, gatherers: 0 }
];

function createResourceHTML(resource) {
    return `
        <div id="resource-${resource.name}" class="resource-container" data-resource="${resource.name}">
            <span class="resource-name">${resource.displayName}</span>
            <span class="resource-amount-container">
                <span class="resource-amount" id="resource-amount-${resource.name}">${resource.amount}</span>
                <span>/</span>
                <span class="resource-max-amount">${resource.maxAmount}</span>
            </span>
            <span class="resource-recovery-rate">(+${resource.recoveryRate.toFixed(2)})</span>
            <span class="resource-gatherers-container">
                <i class="fa-regular fa-user"></i>
                <span class="resource-gatherers" id="resource-gatherers-${resource.name}">${resource.gatherers}</span>
            </span>
        </div>
    `;
}

function setupResourceClickHandlers() {
    document.querySelectorAll('.resource-container').forEach(function(container) {
        container.addEventListener('click', function() {
            var resourceName = this.dataset.resource;
            document.querySelectorAll('.resource-container').forEach(function(el) {
                el.classList.remove('resource-active');
            });
            this.classList.add('resource-active');
            console.log(`gathering resource: ${resourceName}`);
        });
    });
}

function renderResources() {
    var container = document.getElementById('page-resources');
    var html = '<h1>Resources</h1>';
    
    RESOURCE_DATA.forEach(function(resource) {
        html += createResourceHTML(resource);
    });
    
    container.innerHTML = html;
}

