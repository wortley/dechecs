import { Colour, PieceInfo, PieceRef, PieceType } from "../types";

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

export function onSquareClick() {
  // TODO
}
