import { memo } from "react"
import { useDrop } from "react-dnd"
import { DraggableTypes } from "../../constants"
import styles from "./board.module.css"

type SquareProps = {
  id: string // e.g. "e4"
  onClick(): void
  onDrop(): void
  selected: boolean
  isLegalMove: boolean
  wasPrevMove: boolean
  isCheckedKing: boolean
  children?: React.ReactNode // current piece on square
}

const Square = memo(({ id, onClick, selected, onDrop, isLegalMove, wasPrevMove, isCheckedKing, children }: SquareProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: DraggableTypes.PIECE,
      drop: () => onDrop(),
      canDrop: () => isLegalMove,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [onDrop, isLegalMove],
  )

  return (
    <div id={id} ref={drop} className={`${styles.square} ${isLegalMove && styles.legalMove}`} onClick={onClick} onContextMenu={(e) => e.preventDefault()}>
      <div className={`${styles.squareChild} ${styles.piece}`}>{children}</div>
      {selected ? (
        <div className={`${styles.squareChild} ${styles.overlay}`} />
      ) : isCheckedKing ? (
        <div className={`${styles.squareChild} ${styles.overlay} ${styles.check}`} />
      ) : wasPrevMove ? (
        <div className={`${styles.squareChild} ${styles.overlay} ${styles.prevMove}`} />
      ) : null}
      {isLegalMove && <div className={`${styles.squareChild} ${styles.option} ${children && styles.pieceOnSquare}`} />}
    </div>
  )
})

export default Square
