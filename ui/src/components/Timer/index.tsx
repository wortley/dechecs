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
  const [white, setWhite] = useState(timeControl.toString() + ":00");
  const [black, setBlack] = useState(timeControl.toString() + ":00");

  useEffect(() => {
    function onTime(data: TimerData) {
      setWhite(decisecondsToTimeFormat(data.white));
      setBlack(decisecondsToTimeFormat(data.black));
    }

    socket.on("time", onTime);

    return () => {
      socket.off("time", onTime);
    };
  }, []);

  return (
    <div className={styles.timer}>
      <div className={styles.side}>{side === Colour.WHITE ? black : white}</div>
      <hr />
      <div className={styles.side}>{side === Colour.WHITE ? white : black}</div>
    </div>
  );
}
