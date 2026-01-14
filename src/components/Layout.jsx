export default function Layout({ children }) {
  return (
    <div className="appRoot">
      <div className="appShell">{children}</div>
    </div>
  );
}
