import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { estimateFeesPerGas, writeContract } from "wagmi/actions";
import { abi } from "../abi";
import { config } from "../config";
import { SC_ADDRESS, chainId } from "../constants";
import { socket } from "../socket";
import { GameInfo, StartData } from "../types";
import { ETHtoGBP } from "../utils/eth";

export default function Join() {
  const navigate = useNavigate();
  const [joiningGameId, setJoiningGameId] = useState("");
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [wagerAmountGBP, setWagerAmountGBP] = useState<number>(0);

  const { address, isConnected } = useAccount();
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

    async function onGameInfo(data: GameInfo) {
      setWagerAmountGBP(await ETHtoGBP(data.wagerAmount));
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
    try {
      const result = await writeContract(config, {
        abi,
        address: SC_ADDRESS,
        functionName: "joinGame",
        value: parseEther(gameInfo!.wagerAmount.toString()),
        args: [joiningGameId],
      });
      console.log("Transaction successful:", result);
      socket.emit("acceptGame", joiningGameId, address);
    } catch (err) {
      console.error("Transaction error:", err);
      toast.error((err as Error).message.split(".")[0]);
    }
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
          <p>Wager amount: {wagerAmountGBP.toFixed(2)} GBP</p>
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
