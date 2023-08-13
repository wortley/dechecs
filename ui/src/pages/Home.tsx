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
  const [timeControl, setTimeControl] = useState<number>();

  useEffect(() => {
    function onGameId(gameId: string) {
      setNewGameId(gameId);
    }

    function onStart(data: StartData) {
      navigate("/play", {
        state: {
          colour: data.colour,
          timeControl: data.timeControl,
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
    socket.timeout(2000).emit("create", timeControl);
  }

  function onSubmitGameId() {
    socket.timeout(2000).emit("join", joiningGameId);
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
            <option value={undefined} selected disabled hidden></option>
            <option value={3}>3m Blitz</option>
            <option value={5}>5m Blitz</option>
            <option value={10}>10m Rapid</option>
            <option value={30}>30m Classical</option>
          </select>
          <button onClick={onCreateGame}>Generate code</button>
          <button
            onClick={() => {
              setCreating(false);
              setTimeControl(undefined);
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
