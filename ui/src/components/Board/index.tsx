import cloneDeep from "lodash/cloneDeep";
import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../../socket";
import {
  BoardState,
  Castles,
  Colour,
  Move,
  Outcome,
  PieceRef,
  PieceType,
} from "../../types";
import { getAlgebraicNotation, moveToUci, uciToMove } from "../../utils";
import Piece from "../Piece";
import Square from "./Square";
import styles from "./board.module.css";

type BoardProps = {
  colour: Colour;
  turn: Colour;
  setTurn(colour: Colour): void;
  setOutcome(outcome: Outcome): void;
  setWinner(winner?: Colour): void;
};

const initialState = [
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
];

const initialLegalMoves: Move[] = [
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
];

export default function Board({
  colour,
  turn,
  setTurn,
  setOutcome,
  setWinner,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);

  const [selectedPiece, setSelectedPiece] = useState<PieceRef>();
  const [state, setState] = useState(initialState);
  const [prevMove, setPrevMove] = useState("");
  const [legalMoves, setLegalMoves] = useState<Move[]>(initialLegalMoves);
  const [squareCoords, setSquareCoords] =
    useState<Map<string, { x: number; y: number }>>();

  function onResize() {
    const boardRect = boardRef?.current?.getBoundingClientRect();
    if (boardRect) {
      const squareSize = boardRect.width / 8;
      let startX: number;
      let startY: number;
      if (colour === Colour.BLACK) {
        startX = boardRect.right;
        startY = boardRect.top;
      } else {
        startX = boardRect.left;
        startY = boardRect.bottom;
      }
      let currX = startX;
      let currY = startY;
      const newSquareCoords = new Map<string, { x: number; y: number }>();

      if (colour === Colour.BLACK) {
        for (let rank_idx = 0; rank_idx < 8; rank_idx++) {
          for (let file_idx = 0; file_idx < 8; file_idx++) {
            newSquareCoords.set(getAlgebraicNotation(rank_idx, file_idx), {
              x: currX,
              y: currY,
            });
            currX -= squareSize;
          }
          currX = startX;
          currY += squareSize;
        }
      } else {
        for (let rank_idx = 0; rank_idx < 8; rank_idx++) {
          for (let file_idx = 0; file_idx < 8; file_idx++) {
            newSquareCoords.set(getAlgebraicNotation(rank_idx, file_idx), {
              x: currX,
              y: currY,
            });
            currX += squareSize;
          }
          currX = startX;
          currY -= squareSize;
        }
      }

      setSquareCoords(newSquareCoords);
    }
  }

  useEffect(() => {
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function animateMove(fromSquareNotation: string, toSquareNotation: string) {
    const pieceEl = document
      .getElementById(fromSquareNotation)
      ?.getElementsByTagName(`img`)[0];
    const fromCoords = squareCoords?.get(fromSquareNotation);
    const toCoords = squareCoords?.get(toSquareNotation);

    if (pieceEl && fromCoords && toCoords) {
      animating.current = true;
      pieceEl.style.transform = `translate(${toCoords.x - fromCoords.x}px, ${
        toCoords.y - fromCoords.y
      }px)`;
    }
  }

  function animateCastles(rank_idx: number, side: Castles) {
    if (side === Castles.KINGSIDE) {
      animateMove(
        getAlgebraicNotation(rank_idx, 4),
        getAlgebraicNotation(rank_idx, 6)
      );
      animateMove(
        getAlgebraicNotation(rank_idx, 7),
        getAlgebraicNotation(rank_idx, 5)
      );
    } else {
      // Queenside
      animateMove(
        getAlgebraicNotation(rank_idx, 4),
        getAlgebraicNotation(rank_idx, 2)
      );
      animateMove(
        getAlgebraicNotation(rank_idx, 0),
        getAlgebraicNotation(rank_idx, 3)
      );
    }
  }

  useEffect(() => {
    function onMove(data: BoardState) {
      if (data.turn == colour && data.move) {
        // if other player's move
        setPrevMove(data.moveStack?.at(-1) ?? "");
        const move = uciToMove(data.move);
        const newState = cloneDeep(state);

        const piece = newState[move.fromSquare[0]][move.fromSquare[1]];
        newState[move.fromSquare[0]][move.fromSquare[1]] = null;

        if (move.promotion) {
          // replace with queen
          newState[move.toSquare[0]][move.toSquare[1]] = {
            pieceType: PieceType.QUEEN,
            colour: colour === Colour.WHITE ? Colour.BLACK : Colour.WHITE,
          };
          animateMove(data.move.slice(0, 2), data.move.slice(2, 4));
        } else if (data.castles) {
          const rank_idx = colour === Colour.WHITE ? 7 : 0; // reversed as opponent's move
          if (data.castles === Castles.KINGSIDE) {
            newState[rank_idx][7] = null;
            newState[rank_idx][6] = {
              pieceType: PieceType.KING,
              colour: colour === Colour.WHITE ? Colour.BLACK : Colour.WHITE,
            };
            newState[rank_idx][5] = {
              pieceType: PieceType.ROOK,
              colour: colour === Colour.WHITE ? Colour.BLACK : Colour.WHITE,
            };
            animateCastles(rank_idx, Castles.KINGSIDE);
          } else {
            // queenside
            newState[rank_idx][0] = null;
            newState[rank_idx][2] = {
              pieceType: PieceType.KING,
              colour: colour === Colour.WHITE ? Colour.BLACK : Colour.WHITE,
            };
            newState[rank_idx][3] = {
              pieceType: PieceType.ROOK,
              colour: colour === Colour.WHITE ? Colour.BLACK : Colour.WHITE,
            };
            animateCastles(rank_idx, Castles.QUEENSIDE);
          }
        } else if (data.enPassant) {
          newState[
            colour === Colour.WHITE
              ? move.toSquare[0] + 1
              : move.toSquare[0] - 1
          ][move.toSquare[1]] = null;
          newState[move.toSquare[0]][move.toSquare[1]] = piece;
          animateMove(data.move.slice(0, 2), data.move.slice(2, 4));
        } else {
          // regular move
          newState[move.toSquare[0]][move.toSquare[1]] = piece;
          animateMove(data.move.slice(0, 2), data.move.slice(2, 4));
        }

        if (animating.current) {
          setTimeout(() => {
            setState(newState);
            animating.current = false;
          }, 100);
        } else {
          setState(newState);
        }

        setSelectedPiece(undefined);
        setLegalMoves(data.legalMoves.map((m) => uciToMove(m)));
      }

      setTurn(data.turn);

      // process outcome
      if (data.outcome) {
        setOutcome(data.outcome);
        setWinner(data.winner);
      }
    }

    socket.on("move", onMove);

    return () => {
      socket.off("move", onMove);
    };
  }, [squareCoords, state]);

  function isEnPassant(rank_idx: number, file_idx: number) {
    return (
      selectedPiece?.pieceType === PieceType.PAWN &&
      state[rank_idx][file_idx] === null &&
      file_idx !== selectedPiece?.file &&
      rank_idx !== selectedPiece?.rank
    );
  }

  function isCastles(file_idx: number) {
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

  function onSquareClick(rank_idx: number, file_idx: number, dropped = false) {
    if (selectedPiece && turn === colour) {
      const fromSquare: [number, number] = [
        selectedPiece.rank,
        selectedPiece.file,
      ];
      const toSquare: [number, number] = [rank_idx, file_idx];

      if (
        (selectedPiece.rank === rank_idx && selectedPiece.file === file_idx) ||
        !legalMoves.some(
          (m) =>
            m.fromSquare[0] === fromSquare[0] &&
            m.fromSquare[1] === fromSquare[1] &&
            m.toSquare[0] === toSquare[0] &&
            m.toSquare[1] === toSquare[1]
        )
      ) {
        // if piece in same position or illegal move
        return;
      }

      const newState = cloneDeep(state);
      newState[selectedPiece.rank][selectedPiece.file] = null;
      let promotion: PieceType | null = null;

      if (
        selectedPiece.pieceType == PieceType.PAWN &&
        ((turn == Colour.WHITE && rank_idx == 7) ||
          (turn == Colour.BLACK && rank_idx == 0))
      ) {
        // if pawn promotion, auto-promote to queen
        promotion = PieceType.QUEEN;
        newState[rank_idx][file_idx] = {
          pieceType: PieceType.QUEEN,
          colour: colour,
        };
      } else if (isCastles(file_idx)) {
        // castles
        if (file_idx === 6) {
          // short castles
          newState[rank_idx][7] = null;
          newState[rank_idx][file_idx] = selectedPiece;
          newState[rank_idx][file_idx - 1] = {
            pieceType: PieceType.ROOK,
            colour: colour,
          };
          animateCastles(rank_idx, Castles.KINGSIDE);
        } else if (file_idx === 2) {
          // long castles
          newState[rank_idx][0] = null;
          newState[rank_idx][file_idx] = selectedPiece;
          newState[rank_idx][file_idx + 1] = {
            pieceType: PieceType.ROOK,
            colour: colour,
          };
          animateCastles(rank_idx, Castles.QUEENSIDE);
        }
      } else if (isEnPassant(rank_idx, file_idx)) {
        // en passant
        newState[colour === Colour.WHITE ? rank_idx - 1 : rank_idx + 1][
          file_idx
        ] = null;
        newState[rank_idx][file_idx] = selectedPiece;
        animateMove(
          getAlgebraicNotation(selectedPiece?.rank, selectedPiece?.file),
          getAlgebraicNotation(rank_idx, file_idx)
        );
      } else {
        // regular move (not promotion, en passant or castling)
        if (!dropped) {
          const fromSquareNotation = getAlgebraicNotation(
            selectedPiece.rank,
            selectedPiece.file
          );
          const toSquareNotation = getAlgebraicNotation(rank_idx, file_idx);
          animateMove(fromSquareNotation, toSquareNotation);
        }

        newState[rank_idx][file_idx] = {
          pieceType: selectedPiece.pieceType,
          colour: selectedPiece.colour,
        };
      }

      // send move to server
      const uci = moveToUci({ fromSquare, toSquare, promotion });
      setPrevMove(uci);
      socket.timeout(2000).emit("move", uci);

      if (animating.current) {
        setTimeout(() => {
          setState(newState);
          animating.current = false;
        }, 100);
      } else {
        setState(newState);
      }

      setSelectedPiece(undefined);
    }
  }

  const squares = useMemo(() => {
    const boardArray = Array.from({ length: 8 }, () => Array(8).fill(null));

    return colour === Colour.WHITE ? (
      <>
        {/* WHITE */}
        {boardArray.map((rank, rank_idx) => (
          <div className={styles.rank} key={rank_idx}>
            {rank.map((_, file_idx) => (
              <Square
                id={getAlgebraicNotation(7 - rank_idx, file_idx)}
                key={file_idx}
                onClick={() => onSquareClick(7 - rank_idx, file_idx)}
                onDrop={() => onSquareClick(7 - rank_idx, file_idx, true)}
                selected={
                  selectedPiece?.rank === 7 - rank_idx &&
                  selectedPiece.file === file_idx
                }
                isLegalMove={legalMoves.some(
                  (m) =>
                    m.fromSquare[0] === selectedPiece?.rank &&
                    m.fromSquare[1] === selectedPiece?.file &&
                    m.toSquare[0] === 7 - rank_idx &&
                    m.toSquare[1] === file_idx
                )}
                wasPrevMove={prevMove.includes(
                  getAlgebraicNotation(7 - rank_idx, file_idx)
                )}
              >
                {state[7 - rank_idx][file_idx]?.pieceType && (
                  <Piece
                    pieceType={state[7 - rank_idx][file_idx].pieceType}
                    colour={state[7 - rank_idx][file_idx].colour}
                    onClick={() => {
                      if (state[7 - rank_idx][file_idx].colour === colour) {
                        setSelectedPiece({
                          ...state[7 - rank_idx][file_idx],
                          rank: 7 - rank_idx,
                          file: file_idx,
                        });
                      }
                    }}
                    onDrag={() => {
                      if (state[7 - rank_idx][file_idx].colour === colour) {
                        setSelectedPiece({
                          ...state[7 - rank_idx][file_idx],
                          rank: 7 - rank_idx,
                          file: file_idx,
                        });
                      }
                    }}
                  />
                )}
              </Square>
            ))}
          </div>
        ))}
      </>
    ) : (
      <>
        {/* BLACK */}
        {boardArray.map((rank, rank_idx) => (
          <div className={styles.rank} key={rank_idx}>
            {rank.map((_, file_idx) => (
              <Square
                id={getAlgebraicNotation(rank_idx, 7 - file_idx)}
                key={file_idx}
                onClick={() => onSquareClick(rank_idx, 7 - file_idx)}
                onDrop={() => onSquareClick(rank_idx, 7 - file_idx, true)}
                selected={
                  selectedPiece?.rank === rank_idx &&
                  selectedPiece.file === 7 - file_idx
                }
                isLegalMove={legalMoves.some(
                  (m) =>
                    m.fromSquare[0] === selectedPiece?.rank &&
                    m.fromSquare[1] === selectedPiece?.file &&
                    m.toSquare[0] === rank_idx &&
                    m.toSquare[1] === 7 - file_idx
                )}
                wasPrevMove={prevMove.includes(
                  getAlgebraicNotation(rank_idx, 7 - file_idx)
                )}
              >
                {state[rank_idx][7 - file_idx]?.pieceType && (
                  <Piece
                    pieceType={state[rank_idx][7 - file_idx].pieceType}
                    colour={state[rank_idx][7 - file_idx].colour}
                    onClick={() => {
                      if (state[rank_idx][7 - file_idx].colour === colour) {
                        setSelectedPiece({
                          ...state[rank_idx][7 - file_idx],
                          rank: rank_idx,
                          file: 7 - file_idx,
                        });
                      }
                    }}
                    onDrag={() => {
                      if (state[rank_idx][7 - file_idx].colour === colour) {
                        setSelectedPiece({
                          ...state[rank_idx][7 - file_idx],
                          rank: rank_idx,
                          file: 7 - file_idx,
                        });
                      }
                    }}
                  />
                )}
              </Square>
            ))}
          </div>
        ))}
      </>
    );
  }, [state, selectedPiece, legalMoves, prevMove, colour]);

  return (
    <div ref={boardRef} className={styles.board}>
      {squares}
    </div>
  );
}
