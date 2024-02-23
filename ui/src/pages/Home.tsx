import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { StartData } from "../types";

export default function Home() {
  const navigate = useNavigate();
  const [newGameId, setNewGameId] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState("");
  const [timeControl, setTimeControl] = useState<number>(-1);

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
    if (timeControl > 0) socket.emit("create", timeControl);
  }

  function onSubmitGameId() {
    socket.emit("join", joiningGameId);
  }

  return (
    <>
      {creating && !newGameId && (
        <>
          <h4>New game</h4>
          Choose time control:{" "}
          <select
            value={timeControl}
            onChange={(e) => setTimeControl(parseInt(e.currentTarget.value))}
          >
            <option value={-1} disabled hidden></option>
            <option value={3}>3m Blitz</option>
            <option value={5}>5m Blitz</option>
            <option value={10}>10m Rapid</option>
            <option value={30}>30m Classical</option>
          </select>
          <button onClick={onCreateGame} disabled={timeControl < 0}>
            Generate code
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setTimeControl(-1);
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
      {joining && (
        <>
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
              setJoining(false);
              setJoiningGameId("");
            }}
          >
            Back
          </button>
        </>
      )}
      {!joining && !creating && (
        <>
          <button onClick={() => setCreating(true)}>New game</button>
          <button onClick={() => setJoining(true)}>Join game</button>
        </>
      )}
    </>
  );
}
