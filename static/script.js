
var socket = io();

// check session for auto login
document.addEventListener('DOMContentLoaded', function() {
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
});

socket.on('join_success', function(data) {
    if (data.set_cookie) {
        setCookie('player_id', data.full_id, 365);
    }
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'grid';
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
    displayNameInput.textContent = '';
    socket.emit('join', {displayName: displayName});
}

function updatePlayerData(player) {
    if (!player) return;
    document.getElementById('display-name').textContent = player.display_name || 'somehow_unnamed';
    document.getElementById('efficiency').textContent = (player.efficiency || 0) + '%';
    document.getElementById('mastery').textContent = (player.mastery || 0) + '%';
    document.getElementById('artistry').textContent = player.artistry || 0;
}

function retirePlayer() {
    if (confirm('Are you sure you want to retire? Your character will be gone forever!')) {
        socket.emit('retire');
    }
}

document.querySelectorAll('nav a').forEach(function(link) {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        var page = this.dataset.page;
        showPage(page);
    });
});
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

// cookie helpers
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