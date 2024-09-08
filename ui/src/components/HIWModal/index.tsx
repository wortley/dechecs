import { useEffect } from "react"
import styles from "./hiwModal.module.css"

interface HIWModalProps {
  show: boolean
  setShow: (show: boolean) => void
}

export default function TermsModal({ show, setShow }: Readonly<HIWModalProps>) {
  const dialog = document.getElementsByTagName("dialog")[0]

  useEffect(() => {
    if (show) {
      dialog.showModal()
      dialog.scrollTo(0, 0)
    }
  }, [show, dialog])

  function onClose() {
    dialog.close()
    setShow(false)
  }

  return (
    <dialog className={styles.hiwModal}>
      <h3>How it works</h3>
        <ol type="1">
          <li>Connect your web3 wallet and ensure you have some POL on the Polygon mainnet</li>
          <li>Create a new game and select time control, number of rounds and wager</li>
          <li>Pay the wager in POL and share the game code with a chosen opponent</li>
          <li>Join a game by entering the game code and paying the wager</li>
          <li>In each round, players receive 1 point for a win, 0.5 points for a draw and 0 points for a loss</li>
          <li>The winner of the game after all rounds have been played will be awarded the entire prize pool (minus gas fees)</li>
          <li>If the game is a draw, the players will be refunded their wager (minus gas fees)</li>
        </ol>
      <button onClick={onClose}>Got it</button>
    </dialog>
  )
}
