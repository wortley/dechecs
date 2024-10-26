import { useEffect, useRef, useState } from "react"
import { socket } from "../../socket"
import { BoardState, Colour, Outcome, TimerData } from "../../types"
import { millisecondsToTimeFormat } from "../../utils"
import styles from "./timer.module.css"

type TimerProps = {
  side: Colour
  timeControl: number
  outcome?: Outcome
  roundStartTimestamp: number
}

export default function Timer({ side, timeControl, outcome, roundStartTimestamp }: Readonly<TimerProps>) {
  const [timer, setTimer] = useState<TimerData>({
    white: timeControl,
    black: timeControl,
  })
  const [turn, setTurn] = useState<Colour>(Colour.WHITE)
  const timerIntervalId = useRef<NodeJS.Timer>()
  const lastUpdateRef = useRef(roundStartTimestamp);
  const timerRef = useRef(timer)

  useEffect(() => {
    const onMove = (data: BoardState) => {
      if (data.timestamp) {
        const lagTime = Date.now() - data.timestamp

        let newTimer
        if (turn === Colour.WHITE) {
          newTimer = { white: timerRef.current.white + lagTime, black: timerRef.current.black }
        } else {
          newTimer = { white: timerRef.current.white, black: timerRef.current.black + lagTime }
        }

        setTimer(newTimer)
        timerRef.current = newTimer
      }

      setTurn(data.turn)
    }

    socket.on("move", onMove)

    return () => {
      socket.off("move", onMove)
    }
  }, [])

  useEffect(() => {
    if (outcome && outcome > 0) {
      clearInterval(timerIntervalId.current)
      return
    }

    const intervalId = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastUpdateRef.current // compute time elapsed since last tick
      lastUpdateRef.current = now // update last tick time

      let newTimer
      if (turn === Colour.WHITE) {
        newTimer = { white: Math.max(0, timerRef.current.white - elapsed), black: timerRef.current.black }
      } else {
        newTimer = { white: timerRef.current.white, black: Math.max(0, timerRef.current.black - elapsed) }
      }

      // emit 'flag' event if time runs out for current player
      const currentPlayerTime = turn === Colour.WHITE ? newTimer.white : newTimer.black;
      if (currentPlayerTime <= 0 && side === turn) {
        socket.emit("flag", turn);
        clearInterval(timerIntervalId.current);
        return;
      }

      setTimer(newTimer)
      timerRef.current = newTimer
    }, 100) // run every tenth of a second

    timerIntervalId.current = intervalId

    return () => {
      clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, outcome, side])

  return (
    <div className={styles.timer}>
      <div className={styles.side}>{millisecondsToTimeFormat(side === Colour.WHITE ? timer.black : timer.white)}</div>
      <hr />
      <div className={styles.side}>{millisecondsToTimeFormat(side === Colour.WHITE ? timer.white : timer.black)}</div>
    </div>
  )
}
