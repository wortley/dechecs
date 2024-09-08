import { useState } from "react"
import { useNavigate } from "react-router-dom"
import HIWModal from "../components/HIWModal"

export default function Home() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState<boolean>(false)

  return (
    <>
      <div className="home-div">
        <button onClick={() => navigate("/create")}>New game</button>
        <button onClick={() => navigate("/join")}>Join game</button>
        <button onClick={() => setShowModal(true)}>How it works</button>        
      </div>
      <HIWModal show={showModal} setShow={setShowModal} />
    </>
  )
}
