import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAccount, useBalance } from "wagmi";
import { estimateFeesPerGas } from "wagmi/actions";
import { mainnet } from "wagmi/chains";
import { config } from "../config";
import { socket } from "../socket";
import { StartData } from "../types";
import { GBPToETH } from "../utils/eth";

export default function Create() {
  const navigate = useNavigate();
  const [newGameId, setNewGameId] = useState("");
  const [timeControl, setTimeControl] = useState<number>(-1);
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [wagerAmountETH, setWagerAmountETH] = useState<number>(0);
  const [gasPrice, setGasPrice] = useState<number>(0);

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: mainnet.id });

  useEffect(() => {
    function onGameId(gameId: string) {
      setNewGameId(gameId);
    }

    function onStart(data: StartData) {
      navigate("/play", {
        state: {
          colour: data.colour,
          timeRemaining: data.timeRemaining,
        },
      });
    }

    socket.on("gameId", onGameId);
    socket.on("start", onStart);

    return () => {
      socket.off("gameId", onGameId);
      socket.off("start", onStart);
    };
  }, []);

  useEffect(() => {
    async function fetchGasPrice() {
      if (isConnected) {
        const priceInfo = await estimateFeesPerGas(config, {
          chainId: mainnet.id,
          formatUnits: "ether",
        }); // gets gas price for mainnet in ETH
        setGasPrice(Number(priceInfo.formatted.maxFeePerGas));
      }
    }
    fetchGasPrice();
  }, [isConnected]);

  useEffect(() => {
    GBPToETH(wagerAmount).then((ethAmount) => setWagerAmountETH(ethAmount));
  }, [wagerAmount]);

  function validateGameCreation() {
    if (!isConnected) return "Please connect your wallet.";
    if (timeControl < 0) return "Please select a time control.";
    if (wagerAmount <= 0) return "Please enter a wager amount.";
    if (wagerAmountETH >= Number(balance!.formatted) - gasPrice)
      return "Insufficient ETH balance.";
    return 0;
  }

  function onCreateGame() {
    const err = validateGameCreation();
    if (err) {
      toast.error(err);
      return;
    }
    socket.emit("create", timeControl, wagerAmount, wagerAmountETH, address);
  }

  return (
    <div className="home-div">
      {!newGameId && (
        <>
          <h4>New game</h4>
          <label htmlFor="time-control">Time control:</label>
          <select
            id="time-control"
            value={timeControl}
            onChange={(e) => setTimeControl(parseInt(e.currentTarget.value))}
          >
            <option value={-1} disabled hidden></option>
            <option value={3}>3m Blitz</option>
            <option value={5}>5m Blitz</option>
            <option value={10}>10m Rapid</option>
            <option value={30}>30m Classical</option>
          </select>
          <label htmlFor="wager-amount">Wager amount (GBP):</label>
          <input
            type="number"
            id="wager-amount"
            value={wagerAmount}
            min="0"
            step="0.01"
            max="1000"
            onChange={(e) => setWagerAmount(parseFloat(e.currentTarget.value))}
          />
          <p>Wager amount: {wagerAmountETH} ETH</p>
          <p>Gas price: {gasPrice} ETH</p>
          <button onClick={onCreateGame}>Generate code</button>
          <button
            onClick={() => {
              setTimeControl(-1);
              navigate("/");
            }}
          >
            Back
          </button>
        </>
      )}
      {newGameId && (
        <>
          <p>
            Share this code with a friend to play against them. Once they join,
            the game will start.
          </p>
          <h4>{newGameId}</h4>
          <button
            onClick={async () => await navigator.clipboard.writeText(newGameId)}
          >
            Copy code
          </button>
        </>
      )}
    </div>
  );
}
