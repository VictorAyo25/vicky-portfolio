export const metadata = {
  title: '404',
};

export default function NotFound() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#ffffff',
        color: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        letterSpacing: '0.02em',
      }}
    >
      Error 404
    </div>
  );
}
