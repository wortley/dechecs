import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()

  return (
    <>
      <div className="home-div">
        <button onClick={() => navigate("/create")}>New game</button>
        <button onClick={() => navigate("/join")}>Join game</button>
      </div>
      <div className="how-it-works">
        <h5>How it works</h5>
        <ol type="1">
          <li>Connect your web3 wallet and ensure you have some MATIC on the Polygon mainnet</li>
          <li>Create a new game and select time control, number of rounds and wager</li>
          <li>Pay the wager in MATIC and share the game code with a chosen opponent</li>
          <li>Join a game by entering the game code and paying the wager</li>
          <li>In each round, players receive 1 point for a win, 0.5 points for a draw and 0 points for a loss</li>
          <li>The winner of the game after all rounds have been played will be awarded the entire prize pool (minus gas fees and commission)</li>
          <li>If the game is a draw, the players will be refunded their wager (minus gas fees and commission)</li>
        </ol>
      </div>
    </>
  )
}
