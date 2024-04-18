import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-div">
      <button onClick={() => navigate("/create")}>New game</button>
      <button onClick={() => navigate("/join")}>Join game</button>
    </div>
  );
}
