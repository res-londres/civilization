
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

// ----------socket-listeners---------- //
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
socket.on('resources_update', function(data) {
    updateResourcesFromServer(data.resources);
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
var resourceData = {};

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
            if (this.classList.contains('resource-active')) {
                this.classList.remove('resource-active');
                console.log(`stop gathering: ${resourceName}`);
                socket.emit('stop-gather');
            } else {
                document.querySelectorAll('.resource-container').forEach(function(el) {
                    el.classList.remove('resource-active');
                });
                this.classList.add('resource-active');
                console.log(`gathering resource: ${resourceName}`);
                socket.emit('gather', { resource: resourceName }); // TODO: handle this in server
            }
        });
    });
}

function renderResources() {
    var container = document.getElementById('page-resources');
    // show loading if no resource data
    if (Object.keys(resourceData).length === 0) {
        container.innerHTML = '<h1>Resources</h1><p>Loading resources...</p>';
        return;
    }
    var html = '<h1>Resources</h1>';
    var resources = Object.values(resourceData);
    resources.forEach(function(resource) {
        html += createResourceHTML(resource);
    });
    container.innerHTML = html;
    setupResourceClickHandlers();
}

function updateResourceAmount(resourceName, newAmount) {
    var amountElement = document.getElementById('resource-amount-' + resourceName);
    if (amountElement) {
        var displayAmount = Math.round(newAmount);
        amountElement.textContent = displayAmount;
    }
}

function updateResourcesFromServer(data) {
    // data = { wood: { name: 'wood', displayName: 'Wood', amount: 1500, maxAmount: 2500, ... }, ... }
    for (var name in data) {
        resourceData[name] = data[name];
    }
    // if first time, render everything
    if (document.getElementById('page-resources').querySelector('.resource-container') === null) {
        renderResources();
    } else {
        for (var resourceName in data) {
            updateResourceAmount(resourceName, data[resourceName]['amount']);
        }
    }
}