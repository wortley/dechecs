import { useEffect, useState } from "react";
import { socket } from "../../socket";
import { Colour, TimerData } from "../../types";
import { decisecondsToTimeFormat } from "../../utils";
import styles from "./timer.module.css";

type TimerProps = {
  side: Colour;
  timeControl: number;
};

export default function Timer({ side, timeControl }: TimerProps) {
  const [timer, setTimer] = useState<TimerData>({
    white: timeControl * 60,
    black: timeControl * 60,
  });

  useEffect(() => {
    const onTime = (data: TimerData) => setTimer(data);
    socket.on("time", onTime);

    return () => {
      socket.off("time", onTime);
    };
  }, []);

  return side === Colour.WHITE ? (
    <div className={styles.timer}>
      <div className={styles.side}>{decisecondsToTimeFormat(timer.black)}</div>
      <hr />
      <div className={styles.side}>{decisecondsToTimeFormat(timer.white)}</div>
    </div>
  ) : (
    <div className={styles.timer}>
      <div className={styles.side}>{decisecondsToTimeFormat(timer.white)}</div>
      <hr />
      <div className={styles.side}>{decisecondsToTimeFormat(timer.black)}</div>
    </div>
  );
}
