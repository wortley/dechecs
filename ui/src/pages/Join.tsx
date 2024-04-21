import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAccount, useBalance } from "wagmi"
import { estimateFeesPerGas, writeContract } from "wagmi/actions"
import { abi } from "../abi"
import TermsModal from "../components/TermsModal"
import { config } from "../config"
import { SC_ADDRESS, chainId } from "../constants"
import { socket } from "../socket"
import { GameInfo, StartData } from "../types"
import { MATICtoGBP, parseMatic } from "../utils/currency"

export default function Join() {
  const navigate = useNavigate()
  const [joiningGameId, setJoiningGameId] = useState("")
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [wagerAmountGBP, setWagerAmountGBP] = useState<number>(0)
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false)
  const [showModal, setShowModal] = useState<boolean>(false)

  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address, chainId })

  useEffect(() => {
    function onStart(data: StartData) {
      navigate("/play", {
        state: {
          colour: data.colour,
          timeRemaining: data.timeRemaining,
          round: data.round,
          totalRounds: data.totalRounds,
        },
      })
    }

    async function onGameInfo(data: GameInfo) {
      setWagerAmountGBP(await MATICtoGBP(data.wagerAmount))
      setGameInfo(data)
    }

    socket.on("start", onStart)
    socket.on("gameInfo", onGameInfo)

    return () => {
      socket.off("start", onStart)
      socket.off("gameInfo", onGameInfo)
    }
  }, [navigate])

  function onSubmitGameId() {
    socket.emit("join", joiningGameId)
  }

  async function validateAcceptGame() {
    if (!gameInfo) return "Something went wrong"
    if (!isConnected) return "Please connect your wallet."
    if (!acceptTerms) return "Please accept the terms of use."
    const priceInfo = await estimateFeesPerGas(config, {
      chainId,
    })
    const gasPrice = priceInfo.maxFeePerGas

    if (parseMatic(gameInfo.wagerAmount.toString()) >= balance!.value - gasPrice) return "Insufficient MATIC balance."
    return 0
  }

  async function onAcceptGame() {
    const err = await validateAcceptGame()
    if (err) {
      toast.error(err)
      return
    }
    try {
      const result = await writeContract(config, {
        abi,
        address: SC_ADDRESS,
        functionName: "joinGame",
        value: parseMatic(gameInfo!.wagerAmount.toString()),
        args: [joiningGameId],
      })
      console.log("Transaction successful:", result)
      socket.emit("acceptGame", joiningGameId, address)
    } catch (err) {
      console.error("Transaction error:", err)
      toast.error((err as Error).message.split(".")[0])
    }
  }

  return (
    <>
      <div className="home-div">
        <h4>Join game</h4>
        {!gameInfo && (
          <>
            {" "}
            <input type="text" placeholder="Enter game code" value={joiningGameId} onChange={(e) => setJoiningGameId(e.currentTarget.value)} />
            <button onClick={onSubmitGameId}>Join</button>
          </>
        )}
        {gameInfo && (
          <>
            <p>Game code: {joiningGameId}</p>
            <p>Time control: {gameInfo.timeControl}m</p>
            <p>Number of rounds: {gameInfo.totalRounds}</p>
            <p>Wager amount: {wagerAmountGBP.toFixed(2)} GBP</p>
            <div className="accept-terms-container">
              <input type="checkbox" id="accept-terms" value={acceptTerms.toString()} onChange={(e) => setAcceptTerms(e.currentTarget.checked)} />
              <label htmlFor="accept-terms">
                I accept the{" "}
                <a href="#" onClick={() => setShowModal(true)}>
                  terms of use
                </a>
              </label>
            </div>
            <button onClick={onAcceptGame}>Accept and start game</button>
          </>
        )}
        <button
          onClick={() => {
            setJoiningGameId("")
            navigate("/")
          }}
        >
          Back
        </button>
      </div>
      <TermsModal show={showModal} setShow={setShowModal} />
    </>
  )
}
