import { useEffect, useState } from "react";
import { socket } from "../../socket";
import { BoardState, Colour, TimerData } from "../../types";
import { millisecondsToTimeFormat } from "../../utils";
import styles from "./timer.module.css";

type TimerProps = {
  side: Colour;
  timeControl: number;
};

export default function Timer({ side, timeControl }: TimerProps) {
  const [timer, setTimer] = useState<TimerData>({
    white: timeControl,
    black: timeControl,
  });
  const [turn, setTurn] = useState<Colour>(Colour.WHITE);

  useEffect(() => {
    const onMove = (data: BoardState) => {
      setTurn(data.turn);
      if (data.timeRemainingWhite && data.timeRemainingBlack) {
        setTimer({
          white: data.timeRemainingWhite,
          black: data.timeRemainingBlack,
        });
      }
    };

    socket.on("move", onMove);

    return () => {
      socket.off("move", onMove);
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimer((prevTimer) => {
        const newTimer = {
          white:
            turn === Colour.WHITE ? prevTimer.white - 1000 : prevTimer.white,
          black:
            turn === Colour.BLACK ? prevTimer.black - 1000 : prevTimer.black,
        };
        if (turn === Colour.WHITE && newTimer.white <= 0) {
          socket.emit("flag", Colour.WHITE);
        } else if (turn === Colour.BLACK && newTimer.black <= 0) {
          socket.emit("flag", Colour.BLACK);
        }

        return newTimer;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [turn]);

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
  );
}
