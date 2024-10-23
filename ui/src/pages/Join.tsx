import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useAccount, useBalance } from "wagmi"
import { estimateFeesPerGas, writeContract } from "wagmi/actions"
import { abi } from "../abi"
import TermsModal from "../components/TermsModal"
import { config } from "../config"
import { COMMISSION_PERCENTAGE, MAX_GAS, SC_ADDRESS, chainId } from "../constants"
import { socket } from "../socket"
import { GameInfo, StartData } from "../types"
import { POLtoGBP, POLtoUSD, parsePOL } from "../utils/currency"

export default function Join() {
  const navigate = useNavigate()
  const [joiningGameId, setJoiningGameId] = useState("")
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [wagerAmountUSD, setWagerAmountUSD] = useState<number>(0)
  const [wagerAmountGBP, setWagerAmountGBP] = useState<number>(0)
  const [gasPrice, setGasPrice] = useState<bigint>(0n)
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
      setWagerAmountUSD(await POLtoUSD(data.wagerAmount))
      setWagerAmountGBP(await POLtoGBP(data.wagerAmount))
      setGameInfo(data)
    }

    socket.on("start", onStart)
    socket.on("gameInfo", onGameInfo)

    return () => {
      socket.off("start", onStart)
      socket.off("gameInfo", onGameInfo)
    }
  }, [navigate])

  useEffect(() => {
    async function fetchGasPrice() {
      if (isConnected) {
        const priceInfo = await estimateFeesPerGas(config, {
          chainId,
        }) // gets estimated gas price in wei
        setGasPrice(priceInfo.maxFeePerGas)
      }
    }
    fetchGasPrice()
  }, [isConnected])

  function onSubmitGameId() {
    socket.emit("join", joiningGameId)
  }

  async function validateAcceptGame() {
    if (!gameInfo) return "Something went wrong"
    if (!isConnected) return "Please connect your wallet."
    const priceInfo = await estimateFeesPerGas(config, {
      chainId,
    })
    const gasPrice = priceInfo.maxFeePerGas

    if (parsePOL(((gameInfo.wagerAmount * (100 + COMMISSION_PERCENTAGE)) / 100).toString()) >= balance!.value - gasPrice) return "Insufficient MATIC balance."
    return 0
  }

  async function onAcceptGame() {
    const err = await validateAcceptGame()
    if (err) {
      toast.error(err)
      return
    }
    const totalAmount = parsePOL(((gameInfo!.wagerAmount * (100 + COMMISSION_PERCENTAGE)) / 100).toString())
    try {
      const result = await writeContract(config, {
        abi,
        address: SC_ADDRESS,
        functionName: "joinGame",
        value: parsePOL(totalAmount.toString()),
        gas: MAX_GAS,
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
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSubmitGameId()
            }}
          >
            <input type="text" placeholder="Enter game code" value={joiningGameId} onChange={(e) => setJoiningGameId(e.currentTarget.value)} required />
            <button type="submit">View game details</button>
          </form>
        )}
        {gameInfo && (
          <>
            <p>Game code: {joiningGameId}</p>
            <p>Time control: {gameInfo.timeControl}m</p>
            <p>Rounds: {gameInfo.totalRounds}</p>
            <p>
              Wager: {gameInfo.wagerAmount} POL ({wagerAmountUSD.toFixed(2)} USD / {wagerAmountGBP.toFixed(2)} GBP)
            </p>
            <p>Gas price: {(Number(gasPrice) / 10 ** 9).toFixed(2)} Gwei</p>
            <p>Commission: {COMMISSION_PERCENTAGE}%</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onAcceptGame()
              }}
            >
              <div className="accept-terms-container">
                <input type="checkbox" id="accept-terms" required />
                <label htmlFor="accept-terms">
                  I accept the{" "}
                  <a href="#" onClick={() => setShowModal(true)}>
                    terms of use
                  </a>
                </label>
              </div>
              <button type="submit">Join and start game</button>
            </form>
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
