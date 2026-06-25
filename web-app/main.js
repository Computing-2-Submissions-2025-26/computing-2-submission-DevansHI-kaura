import Othello from "./Othello.js";

const BOARD_SIZE = 8;
const board_element = document.getElementById("board-container");
const status_element = document.getElementById("status-display");

let current_state = Othello.empty_state();

// A flat array holding DOM element references for accessible focus management
let dom_cells = [];

/**
 * Helper to capitalise strings for the status display.
 */
const capitalise = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Computes piece counts functionally without loops.
 */
const count_tokens = function (target_token) {
    return current_state.board.flat().filter(function (token) {
        return token === target_token;
    }).length;
};

/**
 * Handles user input and triggers a state update via the pure module.
 * Early return is used if the state reference remains identical (invalid move).
 */
const handle_interaction = function (row) {
    return function (col) {
        const next_state = Othello.ply(current_state)(row)(col);

        // Referential equality check ensures UI only updates on new state
        if (next_state === current_state) {
            return;
        }

        current_state = next_state;
        render_board();
    };
};

/**
 * Keyboard event listener for accessibility.
 * Permits arrow-key navigation and space/enter to place a piece.
 */
const handle_keydown = function (row) {
    return function (col) {
        return function (event) {
            const key = event.key;
            let new_row = row;
            let new_col = col;

            if (key === "Enter" || key === " ") {
                event.preventDefault();
                handle_interaction(row)(col);
                return;
            }

            if (key === "ArrowUp") {
                new_row = Math.max(0, row - 1);
            }
            if (key === "ArrowDown") {
                new_row = Math.min(BOARD_SIZE - 1, row + 1);
            }
            if (key === "ArrowLeft") {
                new_col = Math.max(0, col - 1);
            }
            if (key === "ArrowRight") {
                new_col = Math.min(BOARD_SIZE - 1, col + 1);
            }

            if (new_row !== row || new_col !== col) {
                event.preventDefault();
                const target_index = (new_row * BOARD_SIZE) + new_col;
                dom_cells[target_index].focus();
            }
        };
    };
};

/**
 * Initialises the DOM grid. Called once.
 * Replaces imperative for loops with functional Array.from and forEach.
 */
const initialise_dom = function () {
    const rows = Array.from({length: BOARD_SIZE});

    rows.forEach(function (ignore, row) {
        const cols = Array.from({length: BOARD_SIZE});

        cols.forEach(function (ignore, col) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.role = "button";
            cell.tabIndex = 0; // Essential for keyboard tabbing

            const token = document.createElement("div");
            token.className = "token empty";
            cell.appendChild(token);

            cell.onclick = function () {
                handle_interaction(row)(col);
            };

            cell.onkeydown = handle_keydown(row)(col);

            board_element.appendChild(cell);
            dom_cells.push(cell);
        });
    });
};

/**
 * Updates existing DOM nodes rather than destroying them,
 * which ensures keyboard focus is never lost during a re-render.
 */
const render_board = function () {
    // 1. Update Board Visuals and Screen Reader Labels
    current_state.board.forEach(function (row_array, row) {
        row_array.forEach(function (token_value, col) {
            const cell_index = (row * BOARD_SIZE) + col;
            const cell_element = dom_cells[cell_index];
            const token_element = cell_element.firstChild;

            token_element.className = "token " + token_value;

            let cell_status = "empty";
            if (token_value !== "empty") {
                cell_status = token_value + " piece";
            }

            const label = "Row " + row + ", column " + col + ", " + cell_status;
            cell_element.ariaLabel = label;
        });
    });

    // 2. Update Status Header (Early return for game over state)
    if (current_state.is_game_over) {
        const black_count = count_tokens("black");
        const white_count = count_tokens("white");

        if (black_count > white_count) {
            status_element.textContent = "Black Wins! (" + black_count +
            " to " + white_count + ")";
        } else if (white_count > black_count) {
            status_element.textContent = "White Wins! (" + white_count +
            " to " + black_count + ")";
        } else {
            status_element.textContent = "It's a Draw!";
        }
        return;
    }

    // Happy path (Game ongoing)
    status_element.textContent = capitalise(current_state.turn) + "'s Turn";
};

// Bootstrap application
initialise_dom();
render_board();