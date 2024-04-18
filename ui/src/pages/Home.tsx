import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { getGasPrice } from "wagmi/actions";
import { config } from "../config";
import { socket } from "../socket";
import { StartData } from "../types";

export default function Home() {
  const navigate = useNavigate();
  const [newGameId, setNewGameId] = useState("");
  const [creating, setCreating] = useState<boolean | undefined>();
  const [joiningGameId, setJoiningGameId] = useState("");
  const [timeControl, setTimeControl] = useState<number>(-1);
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [gasPrice, setGasPrice] = useState<number>(0);

  const { address, isConnected } = useAccount();

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

  function onCreateGame() {
    if (timeControl > 0)
      socket.emit("create", timeControl, wagerAmount, address);
  }

  function onSubmitGameId() {
    socket.emit("join", joiningGameId);
  }

  useEffect(() => {
    async function fetchGasPrice() {
      if (isConnected) {
        const gasPrice = await getGasPrice(config, { chainId: 0x1 }); // gets gas price for mainnet in wei
        const ethValue = Number(gasPrice) / 1e18; // convert to ETH
        setGasPrice(ethValue);
      }
    }
    fetchGasPrice();
  }, [isConnected]);

  // TODO: split logic out into multiple pages

  return (
    <>
      {creating && !newGameId && (
        <div className="home-div">
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
          <label htmlFor="wager-amount">Wager amount (ETH):</label>
          <input
            type="number"
            id="wager-amount"
            value={wagerAmount}
            max={100}
            onChange={(e) => setWagerAmount(parseInt(e.currentTarget.value))}
          />
          <p>Gas price: {gasPrice} ETH</p>
          <button onClick={onCreateGame} disabled={timeControl < 0}>
            Generate code
          </button>
          <button
            onClick={() => {
              setCreating(undefined);
              setTimeControl(-1);
            }}
          >
            Back
          </button>
        </div>
      )}
      {newGameId && (
        <div>
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
        </div>
      )}
      {creating === false && (
        <div className="home-div">
          <h4>Join game</h4>
          <input
            type="text"
            placeholder="Enter game code"
            value={joiningGameId}
            onChange={(e) => setJoiningGameId(e.currentTarget.value)}
          />
          <button onClick={onSubmitGameId}>Join</button>
          <button
            onClick={() => {
              setCreating(undefined);
              setJoiningGameId("");
            }}
          >
            Back
          </button>
        </div>
      )}
      {creating === undefined && (
        <div className="home-div">
          <button onClick={() => setCreating(true)}>New game</button>
          <button onClick={() => setCreating(false)}>Join game</button>
        </div>
      )}
    </>
  );
}
