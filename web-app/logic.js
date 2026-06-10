import OthelloLogic from "./game_logic.js";

const initUI = () => {
    const appDiv = document.getElementById('app');
    let currentState = OthelloLogic.createInitialState();

    // Pure component renderer equivalent
    const render = (state) => {
        appDiv.innerHTML = ''; // Clear DOM

        // 1. Build the Table
        const table = document.createElement('table');
        table.className = 'othello-board';

        const validMoves = OthelloLogic.getValidMoves(state.board, state.turn);

        for (let y = 0; y < 8; y++) {
            const tr = document.createElement('tr');
            for (let x = 0; x < 8; x++) {
                const idx = y * 8 + x;
                const td = document.createElement('td');
                td.className = 'cell';

                const disc = document.createElement('div');
                
                if (state.board[idx] === 1) {
                    disc.className = 'disc black';
                } else if (state.board[idx] === 2) {
                    disc.className = 'disc white';
                } else if (!state.isGameOver && validMoves.includes(idx)) {
                    disc.className = 'disc valid-move';
                    td.onclick = () => handleMove(idx);
                }
                
                td.appendChild(disc);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        appDiv.appendChild(table);

        // 2. Build the Status Panel
        const blackCount = state.board.filter(c => c === 1).length;
        const whiteCount = state.board.filter(c => c === 2).length;

        const statusPanel = document.createElement('div');
        statusPanel.className = 'status-board';

        if (state.isGameOver) {
            const winnerText = blackCount > whiteCount ? "Black Wins!" : 
                               whiteCount > blackCount ? "White Wins!" : "It's a Tie!";
            statusPanel.innerHTML = ⁠ <div style="width:100%; text-align:center;">Game Over - ${winnerText}</div> ⁠;
        } else {
            statusPanel.innerHTML = `
                <div class="player-status ${state.turn === 1 ? 'active-turn' : ''}">
                    <div class="status-disc black"></div> Black: ${blackCount}
                </div>
                <div class="player-status ${state.turn === 2 ? 'active-turn' : ''}">
                    White: ${whiteCount} <div class="status-disc white"></div>
                </div>
            `;
        }
        
        appDiv.appendChild(statusPanel);
    };

    // Event handler mapping actions to state updates
    const handleMove = (idx) => {
        currentState = OthelloLogic.makeMove(currentState, idx);
        render(currentState);
    };

    // Initial render
    render(currentState);
};

// Bootstrap the application
initUI();

