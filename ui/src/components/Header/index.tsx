import styles from "./header.module.css"

type HeaderProps = {
  theme: string
  toggleTheme(): void
}

export default function Header({ theme, toggleTheme }: Readonly<HeaderProps>) {
  return (
    <header className={styles.header}>
      <button className={styles.headerLogo} onClick={() => (window.location.href = "/")}>
        d&eacute;checs
      </button>
      <div className={styles.headerRight}>
        <button className={styles.themeSwitch} onClick={toggleTheme}>
          {theme === "light" ? "🌙" : "🔆"}
        </button>
        <div className={styles.w3mContainer}>
          <w3m-button />
        </div>
      </div>
    </header>
  )
}
