import { useEffect, useState } from "react";

import { useLocation } from "react-router-dom";
import Board from "../../components/Board";
import ResultModal from "../../components/ResultModal";
import Timer from "../../components/Timer";
import { socket } from "../../socket";
import { Colour, Outcome } from "../../types";
import styles from "./play.module.css";

export default function Play() {
  const location = useLocation();

  const [turn, setTurn] = useState(Colour.WHITE);
  const [outcome, setOutcome] = useState<Outcome>();
  const [winner, setWinner] = useState<Colour>();
  const [drawOffer, setDrawOffer] = useState(false);

  const colour = location.state.colour;
  const timeControl = location.state.timeControl;

  function onOfferDraw() {
    socket.timeout(2000).emit("offerDraw");
  }

  function onAcceptDraw() {
    socket.timeout(2000).emit("acceptDraw");
  }

  function onResign() {
    socket.timeout(2000).emit("resign");
  }

  useEffect(() => {
    function onReceiveDrawOffer() {
      setDrawOffer(true);
    }

    socket.on("drawOffer", onReceiveDrawOffer);

    return () => {
      socket.off("drawOffer", onReceiveDrawOffer);
    };
  }, []);

  return (
    <>
      <div className={styles.outer}>
        <div className={styles.inner}>
          {colour >= 0 && (
            <Board
              colour={colour}
              turn={turn}
              setTurn={setTurn}
              setOutcome={setOutcome}
              setWinner={setWinner}
            />
          )}
          <Timer side={colour} timeControl={timeControl} />
        </div>
      </div>
      <ResultModal outcome={outcome} winner={winner} side={colour} />
      {drawOffer ? (
        <button onClick={onAcceptDraw}>Accept draw offer</button>
      ) : (
        <button onClick={onOfferDraw}>Offer draw</button>
      )}
      <button onClick={onResign}>Resign</button>
      <small>
        Chess pieces by{" "}
        <a
          href="//commons.wikimedia.org/wiki/User:Cburnett"
          title="User:Cburnett"
        >
          Cburnett
        </a>{" "}
        -{" "}
        <span className="int-own-work" lang="en">
          Own work
        </span>
        ,{" "}
        <a
          href="http://creativecommons.org/licenses/by-sa/3.0/"
          title="Creative Commons Attribution-Share Alike 3.0"
        >
          CC BY-SA 3.0
        </a>
        ,{" "}
        <a href="https://commons.wikimedia.org/w/index.php?curid=1499803">
          Link
        </a>
      </small>
    </>
  );
}
