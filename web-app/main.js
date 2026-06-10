import R from "./ramda.js";

const OthelloLogic = (() => {
    const BOARD_SIZE = 8;
    const DIRECTIONS = [
        [-1, -1], [-1, 0], [-1, 1], 
        [0, -1],           [0, 1], 
        [1, -1],  [1, 0],  [1, 1]
    ];

    // Pure helper functions
    const inBounds = (x, y) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
    const getIdx = (x, y) => y * BOARD_SIZE + x;
    const getXY = idx => [idx % BOARD_SIZE, Math.floor(idx / BOARD_SIZE)];
    const getOpponent = player => player === 1 ? 2 : 1;

    // Recursively finds all discs that will be flipped in a specific direction
    const getFlipsInDirection = (board, player, x, y, dx, dy) => {
        const opponent = getOpponent(player);
        
        const checkNext = (cx, cy, flips) => {
            if (!inBounds(cx, cy)) return [];
            const cell = board[getIdx(cx, cy)];
            
            if (cell === 0) return [];
            if (cell === opponent) return checkNext(cx + dx, cy + dy, R.append(getIdx(cx, cy), flips));
            if (cell === player) return flips;
            return [];
        };
        
        return checkNext(x + dx, y + dy, []);
    };

    // Aggregates all flips across all 8 directions for a specific move
    const getAllFlips = (board, player, idx) => {
        if (board[idx] !== 0) return []; // Must place on empty square
        const [x, y] = getXY(idx);
        
        return R.chain(
            ([dx, dy]) => getFlipsInDirection(board, player, x, y, dx, dy),
            DIRECTIONS
        );
    };

    const isValidMove = (board, player, idx) => getAllFlips(board, player, idx).length > 0;

    const getValidMoves = (board, player) => 
        R.filter(idx => isValidMove(board, player, idx), R.range(0, 64));

    const createInitialState = () => {
        const emptyBoard = R.repeat(0, 64);
        const initialPlacements = [
            [getIdx(3, 3), 2], [getIdx(4, 4), 2],
            [getIdx(3, 4), 1], [getIdx(4, 3), 1]
        ];

        const initBoard = R.reduce(
            (accBoard, [idx, val]) => R.update(idx, val, accBoard),
            emptyBoard,
            initialPlacements
        );

        return {
            board: initBoard,
            turn: 1, // 1: Black, 2: White
            isGameOver: false,
            history: [] // Functional history preservation
        };
    };

    const makeMove = (state, idx) => {
        const { board, turn, history } = state;
        const flips = getAllFlips(board, turn, idx);
        
        // If invalid move, return identical state (pure function behavior)
        if (flips.length === 0) return state;

        // Update the board functionally using reduce
        const indicesToUpdate = R.append(idx, flips);
        const newBoard = R.reduce(
            (accBoard, currentIdx) => R.update(currentIdx, turn, accBoard),
            board,
            indicesToUpdate
        );

        // Determine next turn & check game over conditions
        const nextTurn = getOpponent(turn);
        const nextValidMoves = getValidMoves(newBoard, nextTurn);
        const actualNextTurn = nextValidMoves.length > 0 ? nextTurn : turn;
        
        const finalValidMoves = getValidMoves(newBoard, actualNextTurn);
        const isGameOver = finalValidMoves.length === 0;

        return {
            board: newBoard,
            turn: actualNextTurn,
            isGameOver,
            history: R.append(state, history)
        };
    };

    return {
        createInitialState,
        makeMove,
        getValidMoves
    };
})();

export default Object.freeze(OthelloLogic);