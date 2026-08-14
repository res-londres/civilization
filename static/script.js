
function joinGame() {
    var nameInput = document.getElementById('player-name-input');
    var name = nameInput.value.trim();
    
    if (!name) {
        name = 'Player_' + Math.floor(Math.random() * 10000);
        nameInput.value = name;
    }
    
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'grid';
    
    document.getElementById('player-name').textContent = name;
}