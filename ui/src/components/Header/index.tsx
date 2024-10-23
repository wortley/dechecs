import styles from "./header.module.css"

export default function Header() {
  return (
    <header className={styles.header}>
      <button className={styles.headerLogo} onClick={() => (window.location.href = "/")}>
        d&eacute;checs
      </button>
      <div className={styles.w3mContainer}>
        <w3m-button />
      </div>
    </header>
  )
}
