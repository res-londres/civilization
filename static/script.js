
var socket = io();

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
socket.on('join_success', function(data) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'grid';
    
    document.getElementById('display-name').textContent = data.name;
});
socket.on('join_error', () => {
    invalidNameMessage.textContent = 'Please enter a valid alphanumeric name!';
    displayNameInput.focus();
    joinButton.disabled = false;
    joinButton.textContent = 'Join World';
})

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