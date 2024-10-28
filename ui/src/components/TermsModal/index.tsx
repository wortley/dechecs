import { useEffect } from "react"
import { COMMISSION_PERCENTAGE } from "../../constants"
import styles from "./termsModal.module.css"

interface TermsModalProps {
  show: boolean
  setShow: (show: boolean) => void
}

export default function TermsModal({ show, setShow }: Readonly<TermsModalProps>) {
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
    <dialog className={styles.termsModal}>
      <h3>Terms of use</h3>
      <ol type="1">
        <li>
          <strong>Minimum Age Requirement:</strong> You must be at least 18 years old or the legal age in your jurisdiction to participate.
        </li>
        <li>
          <strong>Binding Contract:</strong> By starting a game, you enter a binding contract to play it to completion. The creator may cancel and cash out up until the point when their opponent joins and pays the wager, at which time the game will start.
        </li>
        <li>
          <strong>Fair Play:</strong> Players are expected to compete without third-party assistance and to engage with others respectfully.
        </li>
        <li>
          <strong>Game Forfeiture:</strong> Abandoning a game results in automatic forfeiture, declaring your opponent the overall victor.
        </li>
        <li>
          <strong>Assistance Disclaimer:</strong> This platform does not detect or prevent use of computer assistance. Play only with trusted individuals. All games carry the risk of third-party
          assistance.
        </li>
        <li>
          <strong>Commission:</strong> A commission of {COMMISSION_PERCENTAGE}% will be added to each player's wager and paid upon creating or joining a game. This is used to cover gas fees and cloud PaaS costs.
        </li>
        <li>
          <strong>No Liability for Losses:</strong> We are not responsible for any financial losses incurred. You manage your own funds and wagers. We are not liable for indirect, incidental, or
          consequential damages.
        </li>

        <li>
          <strong>Compliance with Laws:</strong> Ensure your use complies with all applicable laws; we are not liable for any legal consequences.
        </li>
        <li>
          <strong>Intellectual Property:</strong> All content on the platform is owned by us or our licensors. Users may not reproduce or distribute this content without permission.
        </li>
        <li>
          <strong>Modification of Terms:</strong> We may modify these terms at any time without prior notice. Continued use indicates acceptance of the new terms.
        </li>
        <li>
          <strong>Governing Law:</strong> These terms shall be governed by the laws of the United Kingdom of Great Britain and Northern Ireland.
        </li>
      </ol>
      <button onClick={onClose}>Close</button>
    </dialog>
  )
}
