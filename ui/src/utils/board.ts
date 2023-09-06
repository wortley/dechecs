import { Colour, Move, PieceInfo, PieceRef, PieceType } from "../types";

export function isEnPassant(
  rank_idx: number,
  file_idx: number,
  state: (PieceInfo | null)[][],
  selectedPiece?: PieceRef
) {
  return (
    selectedPiece?.pieceType === PieceType.PAWN &&
    state[rank_idx][file_idx] === null &&
    file_idx !== selectedPiece?.file &&
    rank_idx !== selectedPiece?.rank
  );
}

export function isCastles(
  file_idx: number,
  colour: Colour,
  selectedPiece?: PieceRef
) {
  return (
    selectedPiece?.pieceType === PieceType.KING &&
    ((colour === Colour.WHITE &&
      selectedPiece.rank === 0 &&
      selectedPiece.file === 4) ||
      (colour === Colour.BLACK &&
        selectedPiece.rank === 7 &&
        selectedPiece.file === 4)) &&
    Math.abs(file_idx - selectedPiece.file) === 2
  );
}

export function isPromotion(
  selectedPiece: PieceRef,
  rank_idx: number,
  turn: Colour
) {
  return (
    selectedPiece.pieceType == PieceType.PAWN &&
    ((turn == Colour.WHITE && rank_idx == 7) ||
      (turn == Colour.BLACK && rank_idx == 0))
  );
}

export function isIllegalMove(
  selectedPiece: PieceRef,
  fromSquare: [number, number],
  toSquare: [number, number],
  legalMoves: Move[]
) {
  return (
    (selectedPiece.rank === toSquare[0] &&
      selectedPiece.file === toSquare[1]) ||
    !legalMoves.some(
      (m) =>
        m.fromSquare[0] === fromSquare[0] &&
        m.fromSquare[1] === fromSquare[1] &&
        m.toSquare[0] === toSquare[0] &&
        m.toSquare[1] === toSquare[1]
    )
  );
}
