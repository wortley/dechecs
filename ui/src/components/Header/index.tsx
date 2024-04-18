import styles from "./header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.w3mContainer}>
        <w3m-button />
      </div>
      <h2 className={styles.headerLogo}>unichess</h2>
    </header>
  );
}
