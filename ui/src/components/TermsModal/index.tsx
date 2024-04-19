import { useEffect } from "react";
import { TERMS_OF_USE } from "../../constants/terms";
import styles from "./termsModal.module.css";

interface TermsModalProps {
  show: boolean;
  setShow: (show: boolean) => void;
}

export default function TermsModal({
  show,
  setShow,
}: Readonly<TermsModalProps>) {
  const dialog = document.getElementsByTagName("dialog")[0];

  useEffect(() => {
    if (show) {
      dialog.showModal();
    }
  }, [show, dialog]);

  function onClose() {
    dialog.close();
    setShow(false);
  }

  return (
    <dialog className={styles.termsModal}>
      <h3>Terms of use</h3>
      <p className={styles.termsText}>{TERMS_OF_USE}</p>
      <button onClick={onClose}>Close</button>
    </dialog>
  );
}
