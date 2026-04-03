// ============================================================
// BeamVFX.js — Beam connector visual effect
//
// SVG-based beam drawn between two stage-space points.
// Three layers: outer glow, core beam, hot center.
// Pulse animation via SVG <animate> — no external CSS needed.
//
// Props:
//   from: { x, y } — stage-space origin (caster)
//   to:   { x, y } — stage-space target (enemy)
//
// Rendered inside the battle stage shake container so it
// shares the same coordinate space as combatant sprites.
// ============================================================

function BeamVFX(props) {
    var from = props.from;
    var to = props.to;

    if (!from || !to) return null;

    return (
        <svg style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 50,
            overflow: "visible",
        }}>
            <defs>
                <filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="beam-core-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Outer glow — wide, soft, pulsing */}
            <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(100, 180, 255, 0.35)"
                strokeWidth="16"
                strokeLinecap="round"
                filter="url(#beam-glow)"
            >
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.6s" repeatCount="indefinite" />
            </line>

            {/* Core beam — bright, slightly pulsing */}
            <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(160, 220, 255, 0.85)"
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#beam-core-glow)"
            >
                <animate attributeName="opacity" values="0.8;1;0.8" dur="0.4s" repeatCount="indefinite" />
            </line>

            {/* Hot center — white, stable */}
            <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default BeamVFX;