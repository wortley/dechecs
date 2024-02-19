import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../../socket";
import { Colour, Outcome, StartData } from "../../types";
import styles from "./resultModal.module.css";

type ResultModalProps = {
  outcome?: Outcome;
  winner?: Colour;
  side: Colour;
};

export default function ResultModal({
  outcome,
  winner,
  side,
}: ResultModalProps) {
  const navigate = useNavigate();
  const [rematchOffer, setRematchOffer] = useState(false);
  const dialog = document.getElementsByTagName("dialog")[0];

  useEffect(() => {
    function onStart(data: StartData) {
      navigate("/r", {
        state: {
          colour: data.colour,
          timeRemaining: data.timeRemaining,
          initTimestamp: data.initTimestamp,
        },
      });
    }

    function onRematchOffer() {
      setRematchOffer(true);
    }

    socket.on("start", onStart);
    socket.on("rematchOffer", onRematchOffer);

    return () => {
      socket.off("start", onStart);
      socket.off("rematchOffer", onRematchOffer);
    };
  }, []);

  useEffect(() => {
    if (outcome && outcome > 0) {
      dialog.showModal();
    }
  }, [outcome]);

  const outcomeStr = (function () {
    switch (outcome) {
      case Outcome.CHECKMATE: {
        return "by checkmate";
      }
      case Outcome.STALEMATE: {
        return "by stalemate";
      }
      case Outcome.INSUFFICIENT_MATERIAL: {
        return "by insufficient material";
      }
      case Outcome.FIFTY_MOVES: {
        return "by fifty-move rule";
      }
      case Outcome.THREEFOLD_REPETITION: {
        return "by threefold repetition";
      }
      case Outcome.TIME_OUT: {
        return "on time";
      }
      case Outcome.RESIGNATION: {
        return "by resignation";
      }
      case Outcome.AGREEMENT: {
        return "by agreement";
      }
      default: {
        return;
      }
    }
  })();

  const winnerStr =
    side === winner
      ? "You won"
      : winner === Colour.WHITE
      ? "White won"
      : winner === Colour.BLACK
      ? "Black won"
      : "Draw";

  function onOfferRematch() {
    socket.emit("offerRematch");
  }

  function onAcceptRematch() {
    socket.emit("acceptRematch");
  }

  function onExit() {
    socket.emit("exit");
    navigate("/");
  }

  return (
    <dialog className={styles.resultModal}>
      <h3>{winnerStr}</h3>
      <h4>{outcomeStr}</h4>
      {rematchOffer ? (
        <button onClick={onAcceptRematch}>Accept rematch offer</button>
      ) : (
        <button onClick={onOfferRematch}>Offer rematch</button>
      )}
      <button onClick={onExit}>Exit</button>
    </dialog>
  );
}
