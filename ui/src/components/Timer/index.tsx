import { useEffect, useRef, useState } from "react"
import { socket } from "../../socket"
import { BoardState, Colour, Outcome, TimerData } from "../../types"
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

  useEffect(() => {
    const onMove = (data: BoardState) => {
      setTurn(data.turn)
      if (data.timeRemainingWhite && data.timeRemainingBlack) {
        setTimer({
          white: data.timeRemainingWhite,
          black: data.timeRemainingBlack,
        })
      }
    }

    socket.on("move", onMove)

    return () => {
      socket.off("move", onMove)
    }
  }, [])

  useEffect(() => {
    if (outcome && outcome > 0) {
      clearInterval(timerIntervalId.current);
      return;
    }
  
    let lastUpdateTime = Date.now();
  
    const intervalId = setInterval(() => {
      setTimer((prevTimer) => {
        const now = Date.now();
        const elapsed = now - lastUpdateTime; // compute time elapsed since last tick
        lastUpdateTime = now; // update last tick time
  
        const newTimer = {
          white: turn === Colour.WHITE ? prevTimer.white - elapsed : prevTimer.white,
          black: turn === Colour.BLACK ? prevTimer.black - elapsed : prevTimer.black,
        };
  
        // emit 'flag' event if time runs out for current player
        if (side === Colour.WHITE && turn === Colour.WHITE && newTimer.white <= 0) {
          socket.emit("flag", Colour.WHITE);
        } else if (side === Colour.BLACK && turn === Colour.BLACK && newTimer.black <= 0) {
          socket.emit("flag", Colour.BLACK);
        }
  
        return newTimer;
      });
    }, 50);
  
    timerIntervalId.current = intervalId;
  
    return () => {
      clearInterval(intervalId);
    };
  }, [turn, outcome, side]);

  return side === Colour.WHITE ? (
    <div className={styles.timer}>
      <div className={styles.side}>{millisecondsToTimeFormat(timer.black)}</div>
      <hr />
      <div className={styles.side}>{millisecondsToTimeFormat(timer.white)}</div>
    </div>
  ) : (
    <div className={styles.timer}>
      <div className={styles.side}>{millisecondsToTimeFormat(timer.white)}</div>
      <hr />
      <div className={styles.side}>{millisecondsToTimeFormat(timer.black)}</div>
    </div>
  )
}
