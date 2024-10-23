import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { socket } from "../../socket"
import { Colour, Outcome, StartData } from "../../types"
import styles from "./resultModal.module.css"

type ResultModalProps = {
  outcome?: Outcome
  winner?: Colour
  side: Colour
  score?: [number, number]
  round: number
  totalRounds: number
}

export default function ResultModal({ outcome, winner, side, score, round, totalRounds }: Readonly<ResultModalProps>) {
  const navigate = useNavigate()
  const dialog = document.getElementsByTagName("dialog")[0]
  const [overallWinner, setOverallWinner] = useState<Colour | null>(null)

  useEffect(() => {
    function onStart(data: StartData) {
      navigate("/r", {
        state: {
          colour: data.colour,
          timeRemaining: data.timeRemaining,
          round: data.round,
          totalRounds: data.totalRounds,
        },
      })
    }

    function onMatchEnded(data: { overallWinner: Colour | null }) {
      setOverallWinner(data.overallWinner)
    }

    socket.on("start", onStart)
    socket.on("matchEnded", onMatchEnded)

    return () => {
      socket.off("start", onStart)
      socket.off("matchEnded", onMatchEnded)
    }
  }, [])

  useEffect(() => {
    if (outcome && outcome > 0) {
      dialog.showModal()
    }
  }, [outcome])

  const outcomeStr = (function () {
    switch (outcome) {
      case Outcome.CHECKMATE: {
        return "by checkmate"
      }
      case Outcome.STALEMATE: {
        return "by stalemate"
      }
      case Outcome.INSUFFICIENT_MATERIAL: {
        return "by insufficient material"
      }
      case Outcome.FIFTY_MOVES: {
        return "by fifty-move rule"
      }
      case Outcome.THREEFOLD_REPETITION: {
        return "by threefold repetition"
      }
      case Outcome.TIME_OUT: {
        return "on time"
      }
      case Outcome.RESIGNATION: {
        return "by resignation"
      }
      case Outcome.AGREEMENT: {
        return "by agreement"
      }
      case Outcome.ABANDONED: {
        return "by abandonment"
      }
      default: {
        return
      }
    }
  })()

  const winnerStr = side === winner ? "You won the round" : winner === Colour.WHITE ? "White won the round" : winner === Colour.BLACK ? "Black won the round" : "Draw"

  const playerIndex = side === Colour.WHITE ? 1 : 0
  const opponentIndex = playerIndex === 0 ? 1 : 0

  function onExit() {
    socket.emit("exit")
    navigate("/")
  }

  return (
    <dialog className={styles.resultModal}>
      <h4>
        {winnerStr} {outcomeStr}
      </h4>
      {(round === totalRounds || overallWinner) && (
        <>
          {score && (
            <h5>
              Score: {score[playerIndex]} - {score[opponentIndex]}
            </h5>
          )}
          <p>
            {side === overallWinner
              ? "You win the match! Congratulations! You'll receive your payout shortly."
              : overallWinner === null
                ? "Match drawn. Good game!"
                : "You lost the match. Better luck next time!"}
          </p>
        </>
      )}
      {round < totalRounds && score && !overallWinner && (
        <>
          <h5>
            Score: {score[playerIndex]} - {score[opponentIndex]}
          </h5>
          <p>The next round will start shortly...</p>
        </>
      )}
      <button onClick={onExit}>{round < totalRounds && !overallWinner ? "Forfeit match" : "Exit"}</button>
    </dialog>
  )
}
