
var socket = io();

function joinGame() {
    var displayNameInput = document.getElementById('display-name-input');
    var displayName = displayNameInput.value.trim();
    
    if (!displayName) {
        displayName = 'player_' + Math.floor(Math.random() * 10000);
        displayNameInput.value = displayName;
    }
    socket.emit('join', {displayName: displayName});
}
socket.on('join_success', function(data) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'grid';
    
    document.getElementById('display-name').textContent = data.name;
});

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