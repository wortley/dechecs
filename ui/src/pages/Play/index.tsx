import { sendTransaction } from "@wagmi/core";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import Board from "../../components/Board";
import ResultModal from "../../components/ResultModal";
import Timer from "../../components/Timer";
import { config } from "../../config";
import { chainId } from "../../constants";
import { socket } from "../../socket";
import { Colour, Outcome } from "../../types";
import { GBPToETH } from "../../utils/eth";
import styles from "./play.module.css";

interface PaymentInfo {
  address: `0x${string}`;
  amount: number;
}

export default function Play() {
  const location = useLocation();

  const { address, isConnected } = useAccount();

  const [turn, setTurn] = useState(Colour.WHITE);
  const [outcome, setOutcome] = useState<Outcome>();
  const [winner, setWinner] = useState<Colour>();
  const [drawOffer, setDrawOffer] = useState(false);

  const outcomeRef = useRef(outcome);
  outcomeRef.current = outcome;

  const colour = location.state.colour;
  const timeControl = location.state.timeRemaining;

  function onOfferDraw() {
    socket.emit("offerDraw");
  }

  function onAcceptDraw() {
    socket.emit("acceptDraw");
  }

  function onResign() {
    socket.emit("resign");
  }

  useEffect(() => {
    function onReceiveDrawOffer() {
      setDrawOffer(true);
    }

    async function onPaymentRequest(payment: PaymentInfo) {
      if (!isConnected) {
        return;
      }
      payment.amount = await GBPToETH(payment.amount); // convert GBP to ETH
      const result = await sendTransaction(config, {
        account: address,
        to: payment.address,
        type: "eip1559",
        chainId,
        value: parseEther(payment.amount.toString()), // convert ETH to wei
      });
      console.log(result);
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (outcomeRef.current !== undefined) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }

    socket.on("drawOffer", onReceiveDrawOffer);
    socket.on("payment", onPaymentRequest);

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      socket.off("drawOffer", onReceiveDrawOffer);
      socket.off("payment", onPaymentRequest);
      window.removeEventListener("beforeunload", onBeforeUnload);
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
          <div>
            <Timer side={colour} timeControl={timeControl} />
            {drawOffer ? (
              <button onClick={onAcceptDraw}>Accept draw offer</button>
            ) : (
              <button onClick={onOfferDraw}>Offer draw</button>
            )}
            <button onClick={onResign}>Resign</button>
          </div>
        </div>
      </div>
      <ResultModal outcome={outcome} winner={winner} side={colour} />

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
