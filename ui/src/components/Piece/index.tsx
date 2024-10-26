import { useEffect, useState } from "react"
import { XYCoord, useDrag, useDragLayer } from "react-dnd"
import { getEmptyImage } from "react-dnd-html5-backend"
import { DraggableTypes } from "../../constants"
import blackBishop from "../../pieces/B_b.svg"
import whiteBishop from "../../pieces/B_w.svg"
import blackKing from "../../pieces/K_b.svg"
import whiteKing from "../../pieces/K_w.svg"
import blackKnight from "../../pieces/N_b.svg"
import whiteKnight from "../../pieces/N_w.svg"
import blackPawn from "../../pieces/P_b.svg"
import whitePawn from "../../pieces/P_w.svg"
import blackQueen from "../../pieces/Q_b.svg"
import whiteQueen from "../../pieces/Q_w.svg"
import blackRook from "../../pieces/R_b.svg"
import whiteRook from "../../pieces/R_w.svg"
import { Colour, PieceType } from "../../types"
import styles from "./piece.module.css"

type PieceProps = {
  pieceType: PieceType
  colour: Colour
  onClick(): void
  onDrag(): void
}

const PIECE_IMAGE_MAP = {
  [Colour.WHITE]: {
    [PieceType.KING]: whiteKing,
    [PieceType.QUEEN]: whiteQueen,
    [PieceType.ROOK]: whiteRook,
    [PieceType.BISHOP]: whiteBishop,
    [PieceType.KNIGHT]: whiteKnight,
    [PieceType.PAWN]: whitePawn,
  },
  [Colour.BLACK]: {
    [PieceType.KING]: blackKing,
    [PieceType.QUEEN]: blackQueen,
    [PieceType.ROOK]: blackRook,
    [PieceType.BISHOP]: blackBishop,
    [PieceType.KNIGHT]: blackKnight,
    [PieceType.PAWN]: blackPawn,
  },
}

function getItemStyles(initialOffset: XYCoord | null, currentOffset: XYCoord | null, imageSize: number): React.CSSProperties {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none",
    }
  }
  const { x, y } = currentOffset

  const offset = (imageSize / 2) * -1 // center image on cursor
  const transform = `translate(${x + offset}px, ${y + offset}px)`

  return {
    transform,
    WebkitTransform: transform,
  }
}

export function CustomPreview() {
  const [pieceSize, setPieceSize] = useState<number>(Math.min(window.innerHeight * 0.8, window.innerWidth * 0.9) / 8)

  function onResize() {
    setPieceSize(Math.min(window.innerHeight * 0.8, window.innerWidth * 0.9) / 8)
  }

  useEffect(() => {
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const { isDragging, item, initialOffset, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }))

  if (!isDragging) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 100,
        left: 0,
        top: 0,
      }}
    >
      <div style={getItemStyles(initialOffset, currentOffset, pieceSize)}>
        <img src={PIECE_IMAGE_MAP[item.colour as Colour][item.pieceType as PieceType]} style={{ opacity: 1, width: pieceSize, height: pieceSize }} />
      </div>
    </div>
  )
}

export default function Piece({ pieceType, colour, onClick, onDrag }: Readonly<PieceProps>) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: DraggableTypes.PIECE,
      item: { pieceType, colour },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [pieceType, colour],
  )

  useEffect(() => {
    // set preview to blank image
    preview(getEmptyImage())
  }, [])

  return (
    <img
      ref={drag}
      src={PIECE_IMAGE_MAP[colour][pieceType]}
      className={styles.piece}
      onClick={onClick}
      onMouseDown={onDrag} // drag and drop
      onTouchStart={onDrag}
      style={{
        opacity: isDragging ? 0 : 1, // hide original while dragging
      }}
    />
  )
}
