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

      const handleEscape = (event: KeyboardEvent) => {
        if (dialog.open && event.key === "Escape") {
          event.preventDefault()
          onClose()
        }
      }

      window.addEventListener("keydown", handleEscape)

      return () => {
        window.removeEventListener("keydown", handleEscape)
      }
    }
  }, [show, dialog])

  function onClose() {
    dialog.close()
    setShow(false)
  }

  return (
    <dialog className={styles.hiwModal}>
      <h3>How It Works</h3>
      <ol type="1">
        <li>🔗 Connect your Web3 wallet and ensure you have some POL (formerly MATIC) ready on the Polygon blockchain.</li>
        <li>🕹️ Create a new game by selecting your time control, number of rounds, and wager amount.</li>
        <li>💰 Pay the wager plus a small commission in POL, then share your game code with your opponent.</li>
        <li>🤝 Join a game by entering the game code and paying the wager (plus commission).</li>
        <li>🏆 Earn 1 point for a win, 0.5 points for a draw, and 0 points for a loss in each round.</li>
        <li>🥇 The player with the most points at the end of all rounds wins the entire prize pool.</li>
        <li>🤝 If the game ends in a draw, both players will receive their wager back.</li>
      </ol>
      <button onClick={onClose}>Got it</button>
    </dialog>
  )
}
