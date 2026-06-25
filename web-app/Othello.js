import R from "./ramda.js";

/**
 * A purely functional, referentially transparent module
 * for the game of Othello (Reversi).
 * Contains no UI or DOM manipulation, strictly enforcing
 * separation of concerns.
 * @namespace Othello
 * @author Devanshi Kaura
 * @version 1.0.0
 */
const Othello = Object.create(null);

/**
 * Dimensions of the Othello board.
 * @constant {number}
 */
const BOARD_SIZE = 8;

/**
 * Valid tokens for the board state.
 * @enum {string}
 */
const Token = Object.freeze({
    EMPTY: "empty",
    BLACK: "black",
    WHITE: "white"
});

/**
 * Vectors representing the 8 valid directions for flanking.
 * @constant {Array<Array<number>>}
 */
const DIRECTIONS = Object.freeze([
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
]);

/**
 * Generates an entirely blank row.
 * @returns {Array<string>}
 */
const blank_row = function () {
    return R.repeat(Token.EMPTY, BOARD_SIZE);
};

/**
 * Returns the opposite player's token.
 * @param {string} token
 * @returns {string}
 */
const opponent = function (token) {
    if (token === Token.BLACK) {
        return Token.WHITE;
    }
    return Token.BLACK;
};

/**
 * Checks if a given coordinate is strictly within the board boundaries.
 * Data-last functional design.
 * @param {number} row
 * @returns {function(number): boolean}
 */
const is_on_board = function (row) {
    return function (col) {
        const valid_r = row >= 0 && row < BOARD_SIZE;
        const valid_c = col >= 0 && col < BOARD_SIZE;
        return valid_r && valid_c;
    };
};

/**
 * Safely retrieves a cell's token. Returns undefined if out of bounds.
 * @param {number} row
 * @returns {function(number): function(Array<Array<string>>):
 * string | undefined}
 */
const get_cell = function (row) {
    return function (col) {
        return function (board) {
            if (is_on_board(row)(col)) {
                return board[row][col];
            }
            return undefined;
        };
    };
};

/**
 * Non-mutating update of a specific cell in the 2D array.
 * @param {string} token
 * @returns {function(number): function(number): function(Array<Array<string>>):
 * Array<Array<string>>}
 */
const set_cell = function (token) {
    return function (row) {
        return function (col) {
            return function (board) {
                const updated_row = R.update(col, token, board[row]);
                return R.update(row, updated_row, board);
            };
        };
    };
};

/**
 * Traces a path across the board in a specific direction to find
 * outflanked opponent discs. Returns an empty array if the path hits
 * the board edge or an empty square before finding a matching player disc.
 * @param {Array<Array<string>>} board
 * @returns {function(string): function(number): function(number):
 * function(number):
 * function(number): function(Array<Array<number>>): Array<Array<number>>}
 */
const traverse = function (board) {
    return function (player_token) {
        return function (row) {
            return function (col) {
                return function (d_row) {
                    return function (d_col) {
                        return function (acc) {
                            const next_r = row + d_row;
                            const next_c = col + d_col;
                            const get_c = get_cell(next_r)(next_c);
                            const cell = get_c(board);

                            if (!cell || cell === Token.EMPTY) {
                                return [];
                            }

                            if (cell === player_token) {
                                return acc;
                            }

                            const next_acc = [...acc, [next_r, next_c]];
                            const step1 = traverse(board)(player_token);
                            const next_step = step1(next_r)(next_c);

                            return next_step(d_row)(d_col)(next_acc);
                        };
                    };
                };
            };
        };
    };
};

/**
 * Gets the coordinates of all opponent discs that would be flipped
 * in a single specified direction from a starting square.
 * @param {Array<Array<string>>} board
 * @returns {function(string): function(number): function(number):
 * function(number): function(number): Array<Array<number>>}
 */
const get_flips_in_direction = function (board) {
    return function (player_token) {
        return function (row) {
            return function (col) {
                return function (d_row) {
                    return function (d_col) {
                        const step1 = traverse(board)(player_token);
                        const get_path = step1(row)(col);
                        return get_path(d_row)(d_col)([]);
                    };
                };
            };
        };
    };
};

/**
 * Collects coordinates of all opponent discs that will be outflanked
 * and flipped across all 8 possible directions for a given move.
 * @param {Array<Array<string>>} board
 * @returns {function(string): function(number): function(number):
 * Array<Array<number>>}
 */
const get_all_flips = function (board) {
    return function (player_token) {
        return function (row) {
            return function (col) {
                return R.chain(
                    function (direction) {
                        const d_row = direction[0];
                        const d_col = direction[1];

                        const step1 = get_flips_in_direction(board);
                        const check_flips = step1(player_token);

                        return check_flips(row)(col)(d_row)(d_col);
                    },
                    DIRECTIONS
                );
            };
        };
    };
};

/**
 * Predicate checking if placing a piece at the specified row and column
 * legally flanks at least one opponent piece according to Othello rules.
 * @param {Array<Array<string>>} board
 * @returns {function(string): function(number): function(number): boolean}
 */
const is_valid_move = function (board) {
    return function (player_token) {
        return function (row) {
            return function (col) {
                if (get_cell(row)(col)(board) !== Token.EMPTY) {
                    return false;
                }
                const step1 = get_all_flips(board)(player_token);
                return step1(row)(col).length > 0;
            };
        };
    };
};

/**
 * Returns all valid board coordinates `[row, col]` where a given player
 * can legally place a disc.
 * @param {Array<Array<string>>} board
 * @returns {function(string): Array<Array<number>>}
 */
const get_valid_moves = function (board) {
    return function (player_token) {
        const range = R.range(0, BOARD_SIZE);
        const all_coords = R.xprod(range, range);
        return R.filter(
            function (coord) {
                const r = coord[0];
                const c = coord[1];
                return is_valid_move(board)(player_token)(r)(c);
            },
            all_coords
        );
    };
};

/**
 * Flips a collection of outflanked opponent discs to the
 * specified player's token.
 * @param {string} token
 * @returns {function(Array<Array<number>>): function(Array<Array<string>>):
 * Array<Array<string>>}
 */
const apply_flips = function (token) {
    return function (flips_array) {
        return function (board) {
            return R.reduce(
                function (b, coord) {
                    const r = coord[0];
                    const c = coord[1];
                    return set_cell(token)(r)(c)(b);
                },
                board,
                flips_array
            );
        };
    };
};

/**
 * @typedef {Object} GameState
 * @property {Array<Array<string>>} board - 8x8 grid of tokens
 * @property {string} turn - Player whose turn it is next
 * @property {boolean} is_game_over - True if neither player can move
 */

/**
 * Initialises the standard Othello starting layout with the
 * traditional 4 center pieces.
 * @memberof Othello
 * @function empty_state
 * @returns {GameState}
 */
Othello.empty_state = function () {
    const empty_board = R.map(function () {
        return blank_row();
    }, R.range(0, BOARD_SIZE));

    // Setting the initial 4 pieces using function composition / piping
    const setup_board = R.pipe(
        set_cell(Token.WHITE)(3)(3),
        set_cell(Token.BLACK)(3)(4),
        set_cell(Token.BLACK)(4)(3),
        set_cell(Token.WHITE)(4)(4)
    )(empty_board);

    return {
        board: setup_board,
        turn: Token.BLACK, // Black traditionally starts in Othello
        is_game_over: false
    };
};

/**
 * Executes a single turn (ply) in the game of Othello.
 * Placing a disc on the board flanks the opponent's discs, flips them to
 * the current player's colour, and automatically passes the turn to the
 * opponent. If the opponent has no valid moves, their turn is skipped.
 * @memberof Othello
 * @function ply
 * @param {GameState} state
 * @param {number} row
 * @param {number} col
 * @returns {GameState}
 */
Othello.ply = function (state) {
    return function (row) {
        return function (col) {
            // Early Returns for exceptions/invalid conditions
            if (state.is_game_over) {
                return state;
            }
            if (get_cell(row)(col)(state.board) !== Token.EMPTY) {
                return state;
            }

            const step1 = get_all_flips(state.board)(state.turn);
            const flips = step1(row)(col);
            if (flips.length === 0) {
                return state;
            }

            // Happy Path (Apply piece and flips)
            const place_piece = set_cell(state.turn)(row)(col);
            const board_with_piece = place_piece(state.board);
            const step2 = apply_flips(state.turn)(flips);
            const new_board = step2(board_with_piece);

            // Determine next turn dynamics (Skipping turn if no valid moves)
            const next_turn_token = opponent(state.turn);
            const next_moves = get_valid_moves(new_board)(next_turn_token);
            const next_player_can_move = next_moves.length > 0;

            const current_moves = get_valid_moves(new_board)(state.turn);
            const current_player_can_move = current_moves.length > 0;

            let final_turn = state.turn;
            let game_over = false;

            if (next_player_can_move) {
                final_turn = next_turn_token;
            } else if (!current_player_can_move) {
                game_over = true;
            }

            return {
                board: new_board,
                turn: final_turn,
                is_game_over: game_over
            };
        };
    };
};

export default Object.freeze(Othello);