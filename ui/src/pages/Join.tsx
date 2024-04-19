import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { estimateFeesPerGas } from "wagmi/actions";
import { abi } from "../abi";
import { config } from "../config";
import { SC_ADDRESS, chainId } from "../constants";
import { socket } from "../socket";
import { StartData } from "../types";
import { ETHtoGBP } from "../utils/eth";

interface GameInfo {
  timeControl: number; // time control (minutes)
  wagerAmount: number; // wager amount (ETH)
}

export default async function Join() {
  const navigate = useNavigate();
  const [joiningGameId, setJoiningGameId] = useState("");
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { data: balance } = useBalance({ address, chainId });

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
      chainId,
      formatUnits: "ether",
    });
    const gasPrice = Number(priceInfo.formatted.maxFeePerGas);

    if (gameInfo.wagerAmount >= Number(balance!.formatted) - gasPrice)
      return "Insufficient ETH balance.";
    return 0;
  }

  async function onAcceptGame() {
    const err = await validateAcceptGame();
    if (err) {
      toast.error(err);
      return;
    }
    writeContract({
      abi,
      address: SC_ADDRESS,
      functionName: "joinGame",
      value: BigInt(gameInfo!.wagerAmount),
      args: [joiningGameId],
    });
    while (isPending) {
      await new Promise((resolve) => setTimeout(resolve, 100));
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
          <p>Game code: {joiningGameId}</p>
          <p>Time control: {gameInfo.timeControl}m</p>
          <p>
            Wager amount: £{(await ETHtoGBP(gameInfo.wagerAmount)).toFixed(2)}
          </p>
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
