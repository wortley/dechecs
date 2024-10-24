import { useEffect, useState } from "react"
import styles from "./header.module.css"

type HeaderProps = {
  setThemeMode(themeMode: string): void
}

export default function Header({ setThemeMode }: Readonly<HeaderProps>) {
  const [theme, setTheme] = useState("light")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") ?? "light"
    setTheme(savedTheme)
    setThemeMode(savedTheme)
    document.documentElement.setAttribute("data-theme", savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    setThemeMode(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
  }

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
