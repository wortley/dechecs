import { Colour, Move, PieceInfo, PieceType } from "../types"

export const initialState: (PieceInfo | null)[][] = [
  [
    { pieceType: PieceType.ROOK, colour: Colour.WHITE },
    { pieceType: PieceType.KNIGHT, colour: Colour.WHITE },
    { pieceType: PieceType.BISHOP, colour: Colour.WHITE },
    { pieceType: PieceType.QUEEN, colour: Colour.WHITE },
    { pieceType: PieceType.KING, colour: Colour.WHITE },
    { pieceType: PieceType.BISHOP, colour: Colour.WHITE },
    { pieceType: PieceType.KNIGHT, colour: Colour.WHITE },
    { pieceType: PieceType.ROOK, colour: Colour.WHITE },
  ],
  [
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
    { pieceType: PieceType.PAWN, colour: Colour.WHITE },
  ],
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  [
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
    { pieceType: PieceType.PAWN, colour: Colour.BLACK },
  ],
  [
    { pieceType: PieceType.ROOK, colour: Colour.BLACK },
    { pieceType: PieceType.KNIGHT, colour: Colour.BLACK },
    { pieceType: PieceType.BISHOP, colour: Colour.BLACK },
    { pieceType: PieceType.QUEEN, colour: Colour.BLACK },
    { pieceType: PieceType.KING, colour: Colour.BLACK },
    { pieceType: PieceType.BISHOP, colour: Colour.BLACK },
    { pieceType: PieceType.KNIGHT, colour: Colour.BLACK },
    { pieceType: PieceType.ROOK, colour: Colour.BLACK },
  ],
]

export const initialLegalMoves: Move[] = [
  { fromSquare: [0, 6], toSquare: [2, 7], promotion: null },
  { fromSquare: [0, 6], toSquare: [2, 5], promotion: null },
  { fromSquare: [0, 1], toSquare: [2, 2], promotion: null },
  { fromSquare: [0, 1], toSquare: [2, 0], promotion: null },
  { fromSquare: [1, 7], toSquare: [2, 7], promotion: null },
  { fromSquare: [1, 6], toSquare: [2, 6], promotion: null },
  { fromSquare: [1, 5], toSquare: [2, 5], promotion: null },
  { fromSquare: [1, 4], toSquare: [2, 4], promotion: null },
  { fromSquare: [1, 3], toSquare: [2, 3], promotion: null },
  { fromSquare: [1, 2], toSquare: [2, 2], promotion: null },
  { fromSquare: [1, 1], toSquare: [2, 1], promotion: null },
  { fromSquare: [1, 0], toSquare: [2, 0], promotion: null },
  { fromSquare: [1, 7], toSquare: [3, 7], promotion: null },
  { fromSquare: [1, 6], toSquare: [3, 6], promotion: null },
  { fromSquare: [1, 5], toSquare: [3, 5], promotion: null },
  { fromSquare: [1, 4], toSquare: [3, 4], promotion: null },
  { fromSquare: [1, 3], toSquare: [3, 3], promotion: null },
  { fromSquare: [1, 2], toSquare: [3, 2], promotion: null },
  { fromSquare: [1, 1], toSquare: [3, 1], promotion: null },
  { fromSquare: [1, 0], toSquare: [3, 0], promotion: null },
]

export const boardArray = Array.from({ length: 8 }, () => Array(8).fill(null))
