import React, { useEffect } from "react"
import styles from "./modal.module.css"

interface ModalProps {
  show: boolean
  setShow: (show: boolean) => void
  heading: string
  body: React.ReactNode
  closeButtonText: string
  idx?: number
  className?: string
}

export default function Modal({ show, setShow, heading, body, closeButtonText, className, idx = 0 }: Readonly<ModalProps>) {
  const dialog = document.getElementsByTagName("dialog")[idx]

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
    <dialog className={`${styles.modal} ${className}`}>
      <h3>{heading}</h3>
      {body}
      <button onClick={onClose}>{closeButtonText}</button>
    </dialog>
  )
}
