import assert from "node:assert/strict";
import R from "../ramda.js";
import Othello from "../Othello.js";

/**
 * Standard tokens used for testing, mirroring the domain terminology.
 */
const Token = Object.freeze({
    EMPTY: "empty",
    BLACK: "black",
    WHITE: "white"
});

describe("Othello API Behavioural Specifications", function () {

    describe("Othello.empty_state()", function () {
        it("Given a new game, the board should initialise with the 4 standard central pieces and set Black as the starting player", function () {
            const state = Othello.empty_state();

            // Check game meta-state
            assert.strictEqual(state.turn, Token.BLACK, "The first turn must be Black.");
            assert.strictEqual(state.is_game_over, false, "A new game should not be over.");

            // Check specific central board tokens by value
            assert.strictEqual(state.board[3][3], Token.WHITE, "Coordinate (3,3) should be White.");
            assert.strictEqual(state.board[3][4], Token.BLACK, "Coordinate (3,4) should be Black.");
            assert.strictEqual(state.board[4][3], Token.BLACK, "Coordinate (4,3) should be Black.");
            assert.strictEqual(state.board[4][4], Token.WHITE, "Coordinate (4,4) should be White.");

            // Verify the rest of the board is empty without re-implementing loops
            const total_pieces = R.pipe(
                R.flatten,
                R.filter((cell) => cell !== Token.EMPTY),
                R.length
            )(state.board);

            assert.strictEqual(total_pieces, 4, "There should be exactly 4 pieces on a new board.");
        });
    });

    describe("Othello.ply(state)(row)(col)", function () {
        
        it("When a player makes a valid move, the state updates with flipped pieces and passes the turn", function () {
            const initial_state = Othello.empty_state();
            
            // Black plays at (2, 3), which flanks the White piece at (3, 3) against the Black piece at (4, 3)
            const step1 = Othello.ply(initial_state)(2);
            const next_state = step1(3);

            assert.notEqual(initial_state, next_state, "A valid move must return a completely new state object (Referential transparency).");
            assert.strictEqual(next_state.turn, Token.WHITE, "The turn should pass to White after Black plays.");
            
            // Verify the new piece was placed
            assert.strictEqual(next_state.board[2][3], Token.BLACK, "Black's new piece should be placed at (2,3).");
            
            // Verify the flanked piece was flipped
            assert.strictEqual(next_state.board[3][3], Token.BLACK, "The flanked White piece at (3,3) should be flipped to Black.");
        });

        it("When a valid move is made, unaffected rows must retain their exact memory references (Deep Referential Transparency)", function () {
            const initial_state = Othello.empty_state();
            
            const step1 = Othello.ply(initial_state)(2);
            const next_state = step1(3);

            // Row 0 was entirely unaffected by the move at (2, 3).
            // In pure functional programming, unmutated substructures should share references.
            assert.strictEqual(
                initial_state.board[0], 
                next_state.board[0], 
                "Unaffected rows must retain the same memory reference to ensure efficient functional updates."
            );
        });

        it("When a player attempts to place a piece on an already occupied square, the exact same state reference is returned", function () {
            const initial_state = Othello.empty_state();
            
            // Attempt to place on the existing White piece at (3, 3)
            const step1 = Othello.ply(initial_state)(3);
            const next_state = step1(3);

            assert.strictEqual(initial_state, next_state, "Attempting to play on an occupied cell must early-return the exact same state reference.");
        });

        it("When a player attempts a move that does not flank any opponent pieces, the exact same state reference is returned", function () {
            const initial_state = Othello.empty_state();
            
            // Attempt to place in a corner (0, 0) which flanks nothing on turn 1
            const step1 = Othello.ply(initial_state)(0);
            const next_state = step1(0);

            assert.strictEqual(initial_state, next_state, "A non-flanking move must early-return the exact same state reference.");
        });

        it("When a move leaves the NEXT player with no valid moves, but the CURRENT player still has moves, the turn is skipped back to the current player", function () {
            // Setup an artificial scenario where White is entirely surrounded, but not wiped out.
            // O O O
            // O W O
            // O B .
            // If Black plays at the dot, White has no valid moves left to flank Black.
            const blank_row = () => R.repeat(Token.EMPTY, 8);
            const custom_board = R.map(blank_row, R.range(0, 8));
            
            // Block off the top-left corner
            custom_board[0][0] = Token.WHITE;
            custom_board[0][1] = Token.WHITE;
            custom_board[0][2] = Token.WHITE;
            custom_board[1][0] = Token.WHITE;
            custom_board[1][1] = Token.WHITE;
            custom_board[1][2] = Token.WHITE;
            custom_board[2][0] = Token.WHITE;
            custom_board[2][1] = Token.BLACK; 

            const forced_skip_state = {
                board: custom_board,
                turn: Token.BLACK,
                is_game_over: false
            };

            // Black plays at (2, 2)
            const step1 = Othello.ply(forced_skip_state)(2);
            const next_state = step1(2);

            assert.strictEqual(next_state.turn, Token.BLACK, "White has no valid moves, so the turn should skip and remain Black's.");
            assert.strictEqual(next_state.is_game_over, false, "The game should not be over because Black can still play.");
        });

        it("When a player makes a move that leaves BOTH players with no valid moves, the game over state is triggered", function () {
            // Setup: Board is empty except Black at (0, 0) and White at (0, 1). 
            // It is Black's turn. Black plays at (0, 2), flanking White.
            // Result: White will have 0 pieces on the board, meaning White has 0 valid moves.
            // Black will also have 0 valid moves because there are no White pieces left to flank.
            const blank_row = () => R.repeat(Token.EMPTY, 8);
            const custom_board = R.map(blank_row, R.range(0, 8));
            custom_board[0][0] = Token.BLACK;
            custom_board[0][1] = Token.WHITE;

            const almost_over_state = {
                board: custom_board,
                turn: Token.BLACK,
                is_game_over: false
            };

            const step1 = Othello.ply(almost_over_state)(0);
            const final_state = step1(2); // Play at (0, 2)

            assert.strictEqual(final_state.board[0][1], Token.BLACK, "The White piece should be flipped to Black.");
            assert.strictEqual(final_state.is_game_over, true, "The game should detect that neither player has valid moves and end.");
        });

        it("When ply is called on a state where the game is already over, it immediately returns the same state reference", function () {
            const initial_state = Othello.empty_state();
            const over_state = { ...initial_state, is_game_over: true };

            const step1 = Othello.ply(over_state)(2);
            const next_state = step1(3); // Normally a valid move for Black

            assert.strictEqual(over_state, next_state, "If the game is over, the function should early-return the existing state reference.");
        });
    });
});