import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Modal from "../components/Modal"
import { hiwModalContent, noobModalContent } from "../constants/modalContent"
import { UsageStats } from "../types"
import { getUsageStats } from "../utils/stats"

export default function Home() {
  const navigate = useNavigate()
  const [showHIWModal, setShowHIWModal] = useState<boolean>(false)
  const [showNoobModal, setShowNoobModal] = useState<boolean>(false)
  const [usageStats, setUsageStats] = useState<UsageStats>()

  useEffect(() => {
    async function getAndSetUsageStats() {
      setUsageStats(await getUsageStats())
    }
    getAndSetUsageStats()
  }, [])

  return (
    <>
      <div className="home-div">
        <button onClick={() => navigate("/create")}>New game</button>
        <button onClick={() => navigate("/join")}>Join game</button>
        <button onClick={() => setShowHIWModal(true)}>How it works</button>
        <button onClick={() => setShowNoobModal(true)}>New to crypto?</button>
        <p id="stats">
          Total games played: {usageStats?.gamesPlayed ?? 0}
          <br />
          Total amount wagered: {usageStats?.totalWagered ?? 0} POL
        </p>
      </div>
      <Modal show={showHIWModal} setShow={setShowHIWModal} body={hiwModalContent} heading="How it works" closeButtonText="OK" />
      <Modal show={showNoobModal} setShow={setShowNoobModal} body={noobModalContent} heading="Noob quickstart guide" closeButtonText="OK" idx={1} />
    </>
  )
}
