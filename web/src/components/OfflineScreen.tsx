/**
 * A look-alike of the browser's own "no internet" page, shown in place of
 * every locked public page. Safari visitors get Safari's page (worded for Mac,
 * iPhone or iPad); everyone else gets Chrome's, with the suggestions Chrome
 * shows on Windows, other desktops and phones. Both follow the visitor's
 * light/dark preference. Nothing on it is clickable.
 */

export type OfflineVariant =
  | { browser: 'chrome'; platform: 'windows' | 'desktop' | 'mobile' }
  | { browser: 'safari'; device: 'computer' | 'iPhone' | 'iPad' };

export function offlineVariantFromUserAgent(ua: string): OfflineVariant {
  // Real Safari only: Chrome, Firefox and Edge on iOS also say "Safari" in
  // their user agent, but show their own error pages.
  const isSafari =
    /Safari\//.test(ua) && /Version\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR\/|Android/.test(ua);
  if (isSafari) {
    if (/iPhone|iPod/.test(ua)) return { browser: 'safari', device: 'iPhone' };
    if (/iPad/.test(ua)) return { browser: 'safari', device: 'iPad' };
    return { browser: 'safari', device: 'computer' };
  }
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return { browser: 'chrome', platform: 'mobile' };
  return { browser: 'chrome', platform: /Windows/i.test(ua) ? 'windows' : 'desktop' };
}

export default function OfflineScreen({ variant }: { variant: OfflineVariant }) {
  return variant.browser === 'safari' ? <SafariOffline device={variant.device} /> : <ChromeOffline platform={variant.platform} />;
}

/* ---------------------------------- Chrome --------------------------------- */

const CHROME_SUGGESTIONS = {
  windows: ['Checking the network cables, modem, and router', 'Reconnecting to Wi-Fi'],
  desktop: ['Checking the network cables, modem, and router', 'Reconnecting to Wi-Fi'],
  mobile: ['Turning off airplane mode', 'Turning on mobile data or Wi-Fi', 'Checking the signal in your area'],
};

// Chrome's offline T-rex, one character per pixel.
const DINO = [
  '...........########.',
  '..........##.#######',
  '..........##########',
  '..........##########',
  '..........##########',
  '..........#####.....',
  '..........########..',
  '#........#####......',
  '#.......######......',
  '##.....#########....',
  '###...#######.#.....',
  '###########.........',
  '###########.........',
  '.#########..........',
  '..#######...........',
  '...#####............',
  '....###.##..........',
  '....##...#..........',
  '....#....#..........',
  '....##...##.........',
];

function Dino() {
  return (
    <svg
      className="offline-dino"
      width={44}
      height={44}
      viewBox="0 0 20 20"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {DINO.flatMap((row, y) =>
        [...row].map((px, x) => (px === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null))
      )}
    </svg>
  );
}

function ChromeOffline({ platform }: { platform: 'windows' | 'desktop' | 'mobile' }) {
  return (
    <div className="offline-screen">
      <style>{`
        .offline-screen {
          --bg: #ffffff;
          --text: #5f6368;
          --heading: #202124;
          --dino: #535353;
          --link: #1a73e8;
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: auto;
          background: var(--bg);
          color: var(--text);
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Arial, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          text-align: start;
          -webkit-font-smoothing: auto;
        }
        @media (prefers-color-scheme: dark) {
          .offline-screen {
            --bg: #202124;
            --text: #9aa0a6;
            --heading: #e8eaed;
            --dino: #acacac;
            --link: #8ab4f8;
          }
        }
        .offline-wrapper {
          box-sizing: border-box;
          max-width: 600px;
          width: 100%;
          margin: 14vh auto 0;
          padding: 0 24px;
        }
        .offline-dino { display: block; fill: var(--dino); margin-bottom: 40px; }
        .offline-wrapper h1 {
          color: var(--heading);
          font-size: 1.6em;
          font-weight: 400;
          line-height: 1.25em;
          margin: 0 0 16px;
          letter-spacing: normal;
          font-family: inherit;
        }
        .offline-wrapper p { margin: 0; }
        .offline-wrapper ul { margin: 0; padding-inline-start: 40px; }
        .offline-wrapper li { list-style: disc; }
        .offline-link { color: var(--link); }
        .offline-code {
          margin-top: 12px;
          font-size: 0.86667em;
          letter-spacing: normal;
        }
        @media (max-width: 640px) {
          .offline-wrapper { margin-top: 10vh; }
        }
      `}</style>
      <div className="offline-wrapper">
        <Dino />
        <h1>No internet</h1>
        <p>Try:</p>
        <ul>
          {CHROME_SUGGESTIONS[platform].map((s) => (
            <li key={s}>{s}</li>
          ))}
          {platform === 'windows' && (
            <li>
              <span className="offline-link">Running Windows Network Diagnostics</span>
            </li>
          )}
        </ul>
        <div className="offline-code">ERR_INTERNET_DISCONNECTED</div>
      </div>
    </div>
  );
}

/* ---------------------------------- Safari --------------------------------- */

function SafariOffline({ device }: { device: 'computer' | 'iPhone' | 'iPad' }) {
  const isMac = device === 'computer';
  const title = isMac ? 'You Are Not Connected to the Internet' : 'Safari Cannot Open the Page';
  const message = isMac
    ? 'This page can’t be displayed because your computer is currently offline.'
    : `Safari cannot open the page because your ${device} is not connected to the internet.`;

  return (
    <div className="safari-offline">
      <style>{`
        .safari-offline {
          --bg: #f0f0f0;
          --title: #545454;
          --text: #8a8a8a;
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-family: -apple-system, system-ui, 'Helvetica Neue', Helvetica, sans-serif;
          text-align: center;
          -webkit-font-smoothing: antialiased;
        }
        @media (prefers-color-scheme: dark) {
          .safari-offline {
            --bg: #1e1e1e;
            --title: #c8c8c8;
            --text: #8c8c8c;
          }
        }
        .safari-offline-box {
          box-sizing: border-box;
          width: 100%;
          max-width: 540px;
          padding: 0 28px;
          margin-top: -6vh;
        }
        .safari-offline h1 {
          color: var(--title);
          font-family: inherit;
          font-size: 21px;
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: normal;
          margin: 0 0 10px;
        }
        .safari-offline p {
          color: var(--text);
          font-size: 13px;
          line-height: 1.45;
          margin: 0;
        }
        @media (max-width: 640px) {
          .safari-offline h1 { font-size: 22px; }
          .safari-offline p { font-size: 15px; }
        }
      `}</style>
      <div className="safari-offline-box">
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}
