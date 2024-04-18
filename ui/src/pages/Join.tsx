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

interface GameInfo {
  timeControl: number;
  wagerAmount: number;
}

export default function Join() {
  const navigate = useNavigate();
  const [joiningGameId, setJoiningGameId] = useState("");
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: mainnet.id });

  useEffect(() => {
    function onStart(data: StartData) {
      navigate("/play", {
        state: {
          colour: data.colour,
          timeRemaining: data.timeRemaining,
        },
      });
    }

    function onGameInfo(data: GameInfo) {
      setGameInfo(data);
    }

    socket.on("start", onStart);
    socket.on("gameInfo", onGameInfo);

    return () => {
      socket.off("start", onStart);
      socket.off("gameInfo", onGameInfo);
    };
  }, []);

  function onSubmitGameId() {
    socket.emit("join", joiningGameId);
  }

  async function validateAcceptGame() {
    if (!gameInfo) return "Something went wrong";
    if (!isConnected) return "Please connect your wallet.";
    const priceInfo = await estimateFeesPerGas(config, {
      chainId: mainnet.id,
      formatUnits: "ether",
    });
    const gasPrice = Number(priceInfo.formatted.maxFeePerGas);
    const wagerETH = await GBPToETH(gameInfo.wagerAmount);

    if (wagerETH >= Number(balance!.formatted) - gasPrice)
      return "Insufficient ETH balance.";
    return 0;
  }

  async function onAcceptGame() {
    const err = await validateAcceptGame();
    if (err) {
      toast.error(err);
      return;
    }
    socket.emit("acceptGame", joiningGameId, address);
  }

  return (
    <div className="home-div">
      <h4>Join game</h4>
      {!gameInfo && (
        <>
          {" "}
          <input
            type="text"
            placeholder="Enter game code"
            value={joiningGameId}
            onChange={(e) => setJoiningGameId(e.currentTarget.value)}
          />
          <button onClick={onSubmitGameId}>Join</button>
        </>
      )}
      {gameInfo && (
        <>
          <p>Game ID: {joiningGameId}</p>
          <p>Time control: {gameInfo.timeControl}</p>
          <p>Wager amount: {gameInfo.wagerAmount}</p>
          <button onClick={onAcceptGame}>Accept and start game</button>
        </>
      )}
      <button
        onClick={() => {
          setJoiningGameId("");
          navigate("/");
        }}
      >
        Back
      </button>
    </div>
  );
}
