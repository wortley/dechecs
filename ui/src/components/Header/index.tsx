import styles from "./header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <w3m-button />
      <h2 className={styles.headerLogo}>unichess</h2>
    </header>
  );
}
