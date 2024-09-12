import styles from "./header.module.css"

export default function Header() {
  return (
    <header className={styles.header}>
      <button className={styles.headerLogo} onClick={() => (window.location.href = "/")}>
        d&eacute;checs
      </button>
      <div className={styles.headerPieces}> &#9820; &#9822; &#9821; &#9818; &#9819; &#9821; &#9822; &#9820;</div>
      <div className={styles.w3mContainer}>
        <w3m-button />
      </div>
    </header>
  )
}
