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
import { StartData } from "../types"
import { GBPtoMATIC, parseMatic } from "../utils/currency"

export default function Create() {
  const navigate = useNavigate()
  const [newGameId, setNewGameId] = useState("")
  const [timeControl, setTimeControl] = useState<number>(-1)
  const [wagerAmount, setWagerAmount] = useState<number>(0)
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false)
  const [wagerAmountMATIC, setWagerAmountMATIC] = useState<number>(0)
  const [gasPrice, setGasPrice] = useState<bigint>(0n)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [rounds, setRounds] = useState<number>(1)

  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address, chainId })

  useEffect(() => {
    async function onGameId(gameId: string) {
      try {
        const result = await writeContract(config, {
          abi,
          address: SC_ADDRESS,
          functionName: "createGame",
          value: parseMatic(wagerAmountMATIC.toString()), // convert to wei
          args: [gameId],
        })
        console.log("Transaction successful:", result)
        setNewGameId(gameId)
      } catch (err) {
        console.error("Transaction error:", err)
        toast.error((err as Error).message.split(".")[0])
      }
    }

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

    socket.on("gameId", onGameId)
    socket.on("start", onStart)

    return () => {
      socket.off("gameId", onGameId)
      socket.off("start", onStart)
    }
  }, [wagerAmountMATIC, navigate])

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

  useEffect(() => {
    GBPtoMATIC(wagerAmount).then((maticAmount) => setWagerAmountMATIC(maticAmount))
  }, [wagerAmount])

  function validateGameCreation() {
    if (!isConnected) return "Please connect your wallet."
    if (!gasPrice) return "Please wait for gas price to load."
    if (timeControl < 0) return "Please select a time control."
    if (rounds < 1 || rounds > 10) return "Please enter a valid number of rounds."
    if (wagerAmount <= 0 || wagerAmountMATIC <= 0) return "Please enter a wager amount."
    if (parseMatic(wagerAmountMATIC.toString()) >= balance!.value - gasPrice) return "Insufficient MATIC balance."
    if (!acceptTerms) return "Please accept the terms of use."
    return 0
  }

  function onCreateGame() {
    const err = validateGameCreation()
    if (err) {
      toast.error(err)
      return
    }
    socket.emit("create", timeControl, wagerAmountMATIC, address, rounds)
  }

  return (
    <>
      <div className="home-div">
        {!newGameId && (
          <>
            <h4>New game</h4>
            <label htmlFor="time-control">Time control:</label>
            <select id="time-control" value={timeControl} onChange={(e) => setTimeControl(parseInt(e.currentTarget.value))}>
              <option value={-1} disabled hidden></option>
              <option value={3}>3m Blitz</option>
              <option value={5}>5m Blitz</option>
              <option value={10}>10m Rapid</option>
              <option value={30}>30m Classical</option>
            </select>
            <label htmlFor="rounds">Number of rounds:</label>
            <input
              type="number"
              id="rounds"
              onKeyDown={(e) => e.preventDefault()}
              style={{ caretColor: "transparent" }}
              value={rounds}
              min="1"
              step="1"
              max="10"
              onChange={(e) => setRounds(parseInt(e.currentTarget.value))}
            />
            <label htmlFor="wager-amount">Wager amount (GBP):</label>
            <input type="number" id="wager-amount" value={wagerAmount} min="1" step="0.01" max="100000" onChange={(e) => setWagerAmount(parseFloat(e.currentTarget.value))} />
            <p>Wager amount: {wagerAmountMATIC > 0 ? wagerAmountMATIC.toFixed(8) : 0} MATIC</p>
            <p>Gas price: {(Number(gasPrice) / 10 ** 9).toFixed(2)} Gwei</p>
            <div className="accept-terms-container">
              <input type="checkbox" id="accept-terms" value={acceptTerms.toString()} onChange={(e) => setAcceptTerms(e.currentTarget.checked)} />
              <label htmlFor="accept-terms">
                I accept the{" "}
                <a href="#" onClick={() => setShowModal(true)}>
                  terms of use
                </a>
              </label>
            </div>
            <button onClick={onCreateGame}>Generate code</button>
            <button
              onClick={() => {
                setTimeControl(-1)
                navigate("/")
              }}
            >
              Back
            </button>
          </>
        )}
        {newGameId && (
          <>
            <p>Share this code with a friend to play against them. Once they join and accept the wager, the game will start.</p>
            <h4>{newGameId}</h4>
            <button onClick={async () => await navigator.clipboard.writeText(newGameId).then(() => toast.success("Code copied to clipboard."))}>Copy code</button>
          </>
        )}
      </div>
      <TermsModal show={showModal} setShow={setShowModal} />
    </>
  )
}
