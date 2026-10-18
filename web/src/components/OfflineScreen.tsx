/**
 * A look-alike of Chrome's "No internet" page, shown in place of every locked
 * public page. Follows the visitor's light/dark preference and swaps the
 * suggestions for Windows, other desktops, and phones the way Chrome does.
 * Nothing on it is clickable.
 */

export type Platform = 'windows' | 'desktop' | 'mobile';

export function platformFromUserAgent(ua: string): Platform {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'mobile';
  return /Windows/i.test(ua) ? 'windows' : 'desktop';
}

const SUGGESTIONS: Record<Platform, string[]> = {
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

export default function OfflineScreen({ platform }: { platform: Platform }) {
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
          {SUGGESTIONS[platform].map((s) => (
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
