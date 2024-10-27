import { useEffect, useRef, useState } from "react"
import { socket } from "../../socket"
import { Colour, Outcome, TimerData } from "../../types"
import { millisecondsToTimeFormat } from "../../utils"
import styles from "./timer.module.css"

type TimerProps = {
  side: Colour
  timeControl: number
  outcome?: Outcome
}

export default function Timer({ side, timeControl, outcome }: Readonly<TimerProps>) {
  const [timer, setTimer] = useState<TimerData>({
    white: timeControl,
    black: timeControl,
  })
  const [turn, setTurn] = useState<Colour>(Colour.WHITE)
  const timerIntervalId = useRef<NodeJS.Timer>()
  const lastUpdateRef = useRef(performance.now())
  const timerRef = useRef(timer)

  useEffect(() => {
    const onSync = (timerData: TimerData) => {
      setTimer(timerData)
      timerRef.current = timerData
      setTurn((curr) => curr === Colour.WHITE ? Colour.BLACK : Colour.WHITE)
    }

    socket.on("clockSync", onSync)

    return () => {
      socket.off("clockSync", onSync)
    }
  }, [])

  useEffect(() => {
    if (outcome && outcome > 0) {
      clearInterval(timerIntervalId.current)
      return
    }

    const intervalId = setInterval(() => {
      const now = performance.now()
      const elapsed = now - lastUpdateRef.current // compute time elapsed since last tick
      lastUpdateRef.current = now // update last tick time

      let newTimer
      if (turn === Colour.WHITE) {
        newTimer = { white: Math.max(0, timerRef.current.white - elapsed), black: timerRef.current.black }
      } else {
        newTimer = { white: timerRef.current.white, black: Math.max(0, timerRef.current.black - elapsed) }
      }

      // emit 'flag' event if time runs out for either player
      if (newTimer.black <= 0 && newTimer.white <= 0) {
        const flagged = newTimer.black <= newTimer.white ? Colour.BLACK : Colour.WHITE
        socket.emit("flag", flagged)
      }
      else if (newTimer.black <= 0) socket.emit("flag", Colour.BLACK)
      else if (newTimer.white <= 0) socket.emit("flag", Colour.WHITE)

      setTimer(newTimer)
      timerRef.current = newTimer
    }, 200) // run every fifth of a second

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
