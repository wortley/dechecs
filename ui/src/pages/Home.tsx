import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import HIWModal from "../components/HIWModal"
import { UsageStats } from "../types"
import { getUsageStats } from "../utils/stats"

export default function Home() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState<boolean>(false)
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
        <button onClick={() => setShowModal(true)}>How it works</button>
        <p id="stats">
          Total games played: {usageStats?.gamesPlayed ?? 0}
          <br />
          Total amount wagered: {usageStats?.totalWagered ?? 0} POL
        </p>
      </div>
      <HIWModal show={showModal} setShow={setShowModal} />
    </>
  )
}
