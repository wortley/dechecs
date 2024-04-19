export enum PieceType {
  KING = "K",
  QUEEN = "Q",
  ROOK = "R",
  BISHOP = "B",
  KNIGHT = "N",
  PAWN = "P",
}

export enum Colour {
  BLACK,
  WHITE,
}

export enum Castles {
  KINGSIDE = "K",
  QUEENSIDE = "Q",
}

export enum Outcome {
  CHECKMATE = 1,
  STALEMATE = 2,
  INSUFFICIENT_MATERIAL = 3,
  SEVENTYFIVE_MOVES = 4,
  FIVEFOLD_REPETITION = 5,
  FIFTY_MOVES = 6,
  THREEFOLD_REPETITION = 7,
  VARIANT_WIN = 8,
  VARIANT_LOSS = 9,
  VARIANT_DRAW = 10,
  TIME_OUT = 11,
  RESIGNATION = 12,
  AGREEMENT = 13,
  ABANDONED = 14,
}

export type PieceInfo = {
  pieceType: PieceType;
  colour: Colour;
};

export type PieceRef = {
  pieceType: PieceType;
  colour: Colour;
  rank: number;
  file: number;
};

export type Move = {
  fromSquare: [number, number]; // tuple
  toSquare: [number, number];
  promotion: PieceType | null;
};

export type BoardState = {
  turn: Colour;
  winner?: Colour;
  outcome?: Outcome;
  move: string;
  castles: Castles;
  enPassant: boolean;
  isCheck: boolean;
  legalMoves: string[];
  moveStack?: string[];
  timeRemainingWhite?: number;
  timeRemainingBlack?: number;
};

export interface StartData {
  colour: Colour;
  timeRemaining: number;
  round: number;
  totalRounds: number;
}

export interface TimerData {
  white: number;
  black: number;
}

export interface GameInfo {
  timeControl: number;
  wagerAmount: number;
  totalRounds: number;
}
