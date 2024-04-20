import { Move, PieceType } from "../types"

/**
 * Converts move to UCI string.
 *
 * @param {Move} move The move object containing `fromSquare` and `toSquare` as pairs of indices.
 * @returns {string} The UCI string representation of the move.
 */
export function moveToUci(move: Move): string {
  const [fromRank, fromFile] = move.fromSquare
  const [toRank, toFile] = move.toSquare

  const fromSquareUci = `${String.fromCharCode(fromFile + 97)}${fromRank + 1}`
  const toSquareUci = `${String.fromCharCode(toFile + 97)}${toRank + 1}`

  let uci = fromSquareUci + toSquareUci

  if (move.promotion) {
    uci += move.promotion.toLowerCase()
  }

  return uci
}

/**
 * Converts a UCI string to a move object.
 *
 * @param {string} uci - The UCI string representing the move.
 * @returns {Move} The move object with 'fromSquare' and 'toSquare' fields.
 */
export function uciToMove(uci: string): Move {
  const fromSquare: [number, number] = [
    parseInt(uci[1]) - 1,
    uci.charCodeAt(0) - 97,
  ]
  const toSquare: [number, number] = [
    parseInt(uci[3]) - 1,
    uci.charCodeAt(2) - 97,
  ]
  const promotion =
    uci.length === 5 ? (uci[4].toUpperCase() as PieceType) : null // e.g. "e2e4q" => 'q'

  return {
    fromSquare,
    toSquare,
    promotion,
  }
}

/**
 * Converts chess square coordinates to algebraic notation.
 *
 * @param {number} rank_idx - The rank index (row) of the chess square (0 to 7).
 * @param {number} file_idx - The file index (column) of the chess square (0 to 7).
 * @returns {string} The algebraic notation for the given chess square.
 */
export function getAlgebraicNotation(rank_idx: number, file_idx: number) {
  return `${String.fromCharCode(97 + file_idx)}${rank_idx + 1}`
}

/**
 * Converts an integer number of milliseconds to a time string in the format "mm:ss".
 *
 * @param {number} milliseconds
 * @returns {string} The time format string in the format "mm:ss".
 */
export function millisecondsToTimeFormat(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60000)
  const remainingSeconds = Math.floor((milliseconds % 60000) / 1000)

  const minutesString = minutes.toString()
  const secondsString = remainingSeconds.toString().padStart(2, "0")

  return `${minutesString}:${secondsString}`
}
