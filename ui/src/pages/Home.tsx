import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import HIWModal from "../components/HIWModal"
import { getTotalNGames } from "../utils/stats"

export default function Home() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState<boolean>(false)
  const [nGames, setNGames] = useState<number>()

  useEffect(() => {
    async function getAndSetNGames() {
      setNGames(await getTotalNGames())
    }
    getAndSetNGames()
  }, [])

  return (
    <>
      <div className="home-div">
        <button onClick={() => navigate("/create")}>New game</button>
        <button onClick={() => navigate("/join")}>Join game</button>
        <button onClick={() => setShowModal(true)}>How it works</button>
        <p id="ngames">Total games played so far: {nGames ?? 0}</p>
      </div>
      <HIWModal show={showModal} setShow={setShowModal} />
    </>
  )
}
