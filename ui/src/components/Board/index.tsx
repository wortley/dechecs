import cloneDeep from "lodash/cloneDeep"
import { useEffect, useRef, useState } from "react"
import { boardArray, initialLegalMoves, initialState } from "../../constants/board"
import { socket } from "../../socket"
import { BoardState, Castles, Colour, Move, Outcome, PieceInfo, PieceRef, PieceType } from "../../types"
import { getAlgebraicNotation, moveToUci, uciToMove } from "../../utils"
import { isCastles, isEnPassant, isIllegalMove, isPromotion } from "../../utils/board"
import Piece from "../Piece"
import Square from "./Square"
import styles from "./board.module.css"

type BoardProps = {
  colour: Colour
  turn: Colour
  setTurn(colour: Colour): void
  setOutcome(outcome: Outcome): void
  setWinner(winner?: Colour): void
  setScore(score: [number, number]): void
}

export default function Board({ colour, turn, setTurn, setOutcome, setWinner, setScore }: Readonly<BoardProps>) {
  const boardRef = useRef<HTMLDivElement>(null)
  const animating = useRef(false)
  const squareCoords = useRef<Map<string, { x: number; y: number }>>()
  const oppositeColour = useRef(colour === Colour.WHITE ? Colour.BLACK : Colour.WHITE)

  const [selectedPiece, setSelectedPiece] = useState<PieceRef>()
  const [state, setState] = useState<(PieceInfo | null)[][]>(initialState)
  const [prevMove, setPrevMove] = useState("")
  const [legalMoves, setLegalMoves] = useState<Move[]>(initialLegalMoves)
  const [isCheck, setIsCheck] = useState(false)

  function onResize() {
    const boardRect = boardRef?.current?.getBoundingClientRect()
    if (boardRect) {
      const squareSize = boardRect.width / 8
      let startX: number
      let startY: number
      if (colour === Colour.BLACK) {
        startX = boardRect.right
        startY = boardRect.top
      } else {
        startX = boardRect.left
        startY = boardRect.bottom
      }
      let currX = startX
      let currY = startY
      const newSquareCoords = new Map<string, { x: number; y: number }>()

      if (colour === Colour.BLACK) {
        for (let rank_idx = 0; rank_idx < 8; rank_idx++) {
          for (let file_idx = 0; file_idx < 8; file_idx++) {
            newSquareCoords.set(getAlgebraicNotation(rank_idx, file_idx), {
              x: currX,
              y: currY,
            })
            currX -= squareSize
          }
          currX = startX
          currY += squareSize
        }
      } else {
        for (let rank_idx = 0; rank_idx < 8; rank_idx++) {
          for (let file_idx = 0; file_idx < 8; file_idx++) {
            newSquareCoords.set(getAlgebraicNotation(rank_idx, file_idx), {
              x: currX,
              y: currY,
            })
            currX += squareSize
          }
          currX = startX
          currY -= squareSize
        }
      }

      squareCoords.current = newSquareCoords
    }
  }

  useEffect(() => {
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  function animateMove(fromSquareNotation: string, toSquareNotation: string) {
    const pieceEl = document.getElementById(fromSquareNotation)?.getElementsByTagName(`img`)[0]
    const fromCoords = squareCoords.current?.get(fromSquareNotation)
    const toCoords = squareCoords.current?.get(toSquareNotation)

    if (pieceEl && fromCoords && toCoords) {
      animating.current = true
      pieceEl.style.transform = `translate(${toCoords.x - fromCoords.x}px, ${toCoords.y - fromCoords.y}px)`
    }
  }

  function animateCastles(rank_idx: number, side: Castles) {
    if (side === Castles.KINGSIDE) {
      animateMove(getAlgebraicNotation(rank_idx, 4), getAlgebraicNotation(rank_idx, 6))
      animateMove(getAlgebraicNotation(rank_idx, 7), getAlgebraicNotation(rank_idx, 5))
    } else {
      // Queenside
      animateMove(getAlgebraicNotation(rank_idx, 4), getAlgebraicNotation(rank_idx, 2))
      animateMove(getAlgebraicNotation(rank_idx, 0), getAlgebraicNotation(rank_idx, 3))
    }
  }

  useEffect(() => {
    function onMove(data: BoardState) {
      if (data.turn == colour && data.move) {
        // if other player just moved
        setPrevMove(data.moveStack?.at(-1) ?? "")

        const move = uciToMove(data.move)
        const newState = cloneDeep(state)

        const piece = newState[move.fromSquare[0]][move.fromSquare[1]]
        newState[move.fromSquare[0]][move.fromSquare[1]] = null

        if (move.promotion) {
          // replace with queen
          newState[move.toSquare[0]][move.toSquare[1]] = {
            pieceType: PieceType.QUEEN,
            colour: oppositeColour.current,
          }
          animateMove(data.move.slice(0, 2), data.move.slice(2, 4))
        } else if (data.castles) {
          const rank_idx = colour === Colour.WHITE ? 7 : 0 // reversed as opponent's move
          if (data.castles === Castles.KINGSIDE) {
            newState[rank_idx][7] = null
            newState[rank_idx][6] = {
              pieceType: PieceType.KING,
              colour: oppositeColour.current,
            }
            newState[rank_idx][5] = {
              pieceType: PieceType.ROOK,
              colour: oppositeColour.current,
            }
            animateCastles(rank_idx, Castles.KINGSIDE)
          } else {
            // queenside
            newState[rank_idx][0] = null
            newState[rank_idx][2] = {
              pieceType: PieceType.KING,
              colour: oppositeColour.current,
            }
            newState[rank_idx][3] = {
              pieceType: PieceType.ROOK,
              colour: oppositeColour.current,
            }
            animateCastles(rank_idx, Castles.QUEENSIDE)
          }
        } else if (data.enPassant) {
          newState[colour === Colour.WHITE ? move.toSquare[0] + 1 : move.toSquare[0] - 1][move.toSquare[1]] = null
          newState[move.toSquare[0]][move.toSquare[1]] = piece
          animateMove(data.move.slice(0, 2), data.move.slice(2, 4))
        } else {
          // regular move
          newState[move.toSquare[0]][move.toSquare[1]] = piece
          animateMove(data.move.slice(0, 2), data.move.slice(2, 4))
        }

        if (animating.current) {
          setTimeout(() => {
            setState(newState)
            animating.current = false
          }, 100)
        } else {
          setState(newState)
        }

        setSelectedPiece(undefined)
        setLegalMoves(data.legalMoves.map((m) => uciToMove(m)))
      }

      setTurn(data.turn)
      setIsCheck(data.isCheck)

      // process outcome
      if (data.outcome) {
        setOutcome(data.outcome)
        setWinner(data.winner)
        if (data.matchScore) setScore(data.matchScore)
      }
    }

    socket.on("move", onMove)

    return () => {
      socket.off("move", onMove)
    }
  }, [squareCoords.current, state])

  function handleCastles(newState: (PieceInfo | null)[][], selectedPiece: PieceRef, rank_idx: number, file_idx: number) {
    if (file_idx === 6) {
      // short castles
      newState[rank_idx][7] = null
      newState[rank_idx][file_idx] = selectedPiece as PieceInfo
      newState[rank_idx][file_idx - 1] = {
        pieceType: PieceType.ROOK,
        colour,
      }
      animateCastles(rank_idx, Castles.KINGSIDE)
    } else if (file_idx === 2) {
      // long castles
      newState[rank_idx][0] = null
      newState[rank_idx][file_idx] = selectedPiece
      newState[rank_idx][file_idx + 1] = {
        pieceType: PieceType.ROOK,
        colour,
      }
      animateCastles(rank_idx, Castles.QUEENSIDE)
    }
    return newState
  }

  function handleEnPassant(newState: (PieceInfo | null)[][], selectedPiece: PieceRef, rank_idx: number, file_idx: number) {
    newState[colour === Colour.WHITE ? rank_idx - 1 : rank_idx + 1][file_idx] = null
    newState[rank_idx][file_idx] = selectedPiece as PieceInfo
    return newState
  }

  function handlePromotion(newState: (PieceInfo | null)[][], promotion: PieceType, rank_idx: number, file_idx: number, colour: Colour) {
    newState[rank_idx][file_idx] = {
      pieceType: promotion,
      colour,
    }
    return newState
  }

  function onSquareClick(rank_idx: number, file_idx: number, dropped = false) {
    if (selectedPiece && turn === colour) {
      const fromSquare: [number, number] = [selectedPiece.rank, selectedPiece.file]
      const toSquare: [number, number] = [rank_idx, file_idx]
      const fromSquareNotation = getAlgebraicNotation(fromSquare[0], fromSquare[1])
      const toSquareNotation = getAlgebraicNotation(toSquare[0], toSquare[1])

      if (isIllegalMove(selectedPiece, fromSquare, toSquare, legalMoves)) {
        return
      }

      let newState = cloneDeep(state)
      newState[selectedPiece.rank][selectedPiece.file] = null
      let promotion: PieceType | null = null

      if (isPromotion(selectedPiece, rank_idx, turn)) {
        // auto-promote to queen
        promotion = PieceType.QUEEN
        newState = handlePromotion(newState, promotion, rank_idx, file_idx, colour)
      } else if (isCastles(file_idx, colour, selectedPiece)) {
        newState = handleCastles(newState, selectedPiece, rank_idx, file_idx)
      } else if (isEnPassant(rank_idx, file_idx, state, selectedPiece)) {
        newState = handleEnPassant(newState, selectedPiece, rank_idx, file_idx)
      } else {
        // all other moves
        newState[rank_idx][file_idx] = selectedPiece as PieceInfo
      }

      if (!dropped && !isCastles(file_idx, colour, selectedPiece)) {
        animateMove(fromSquareNotation, toSquareNotation)
      }

      // send move to server
      const uci = moveToUci({ fromSquare, toSquare, promotion })
      setPrevMove(uci)
      socket.emit("move", uci)

      if (animating.current) {
        setTimeout(() => {
          setState(newState)
          animating.current = false
        }, 100)
      } else {
        setState(newState)
      }
      setSelectedPiece(undefined)
    }
  }

  const generateBoard = () => {
    let getRank: (rank_idx: number) => number
    let getFile: (file_idx: number) => number

    if (colour === Colour.WHITE) {
      getRank = (rank_idx) => 7 - rank_idx
      getFile = (file_idx) => file_idx
    } else {
      getRank = (rank_idx) => rank_idx
      getFile = (file_idx) => 7 - file_idx
    }

    return boardArray.map((rank, rank_idx) => (
      <div className={styles.rank} key={rank_idx}>
        {rank.map((_, file_idx) => (
          <Square
            id={getAlgebraicNotation(getRank(rank_idx), getFile(file_idx))}
            key={file_idx}
            onClick={() => onSquareClick(getRank(rank_idx), getFile(file_idx))}
            onDrop={() => onSquareClick(getRank(rank_idx), getFile(file_idx), true)}
            selected={selectedPiece?.rank === getRank(rank_idx) && selectedPiece.file === getFile(file_idx)}
            isLegalMove={legalMoves.some(
              (m) => m.fromSquare[0] === selectedPiece?.rank && m.fromSquare[1] === selectedPiece?.file && m.toSquare[0] === getRank(rank_idx) && m.toSquare[1] === getFile(file_idx),
            )}
            wasPrevMove={prevMove.includes(getAlgebraicNotation(getRank(rank_idx), getFile(file_idx)))}
            isCheckedKing={state[getRank(rank_idx)][getFile(file_idx)]?.pieceType === PieceType.KING && isCheck && state[getRank(rank_idx)][getFile(file_idx)]?.colour === turn}
          >
            {state[getRank(rank_idx)][getFile(file_idx)] != null && (
              <Piece
                pieceType={state[getRank(rank_idx)][getFile(file_idx)]!.pieceType}
                colour={state[getRank(rank_idx)][getFile(file_idx)]!.colour}
                onClick={() => {
                  if (state[getRank(rank_idx)][getFile(file_idx)]!.colour === colour) {
                    setSelectedPiece({
                      ...state[getRank(rank_idx)][getFile(file_idx)]!,
                      rank: getRank(rank_idx),
                      file: getFile(file_idx),
                    })
                  }
                }}
                onDrag={() => {
                  if (state[getRank(rank_idx)][getFile(file_idx)]!.colour === colour) {
                    setSelectedPiece({
                      ...state[getRank(rank_idx)][getFile(file_idx)]!,
                      rank: getRank(rank_idx),
                      file: getFile(file_idx),
                    })
                  }
                }}
              />
            )}
          </Square>
        ))}
      </div>
    ))
  }

  return (
    <div ref={boardRef} className={styles.board}>
      {generateBoard()}
    </div>
  )
}
