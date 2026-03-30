// ============================================================
// QTERunner.js — QTE Plugin Host (DES-2)
//
// Generic QTE mounting point. Receives a config describing
// which QTE type to run, mounts the correct plugin, relays
// callbacks to the host. Renders nothing when idle.
//
// BOUNDARY CONTRACT:
//   Props:
//     qteConfig   — null (idle) or { type, ...pluginSettings }
//     onComplete  — function(result) — called when QTE finishes
//     onRingResult — function(index, hit) — optional per-ring callback
//
//   Result shape varies by plugin type. CircleTimingQTE returns:
//     { hits, total, details, successRatio }
//
// PLUGIN REGISTRY:
//   Each entry maps a type string to a { component } object.
//   To add a new QTE type:
//     1. Import the plugin component
//     2. Add an entry to PLUGIN_REGISTRY
//     3. Done — QTERunner handles the rest
//
// DESIGN NOTES:
//   - Runner owns ZERO gameplay logic. It's a switchboard.
//   - Plugins receive config + callbacks as props. They own
//     their own animation, input, and timing.
//   - Runner unmounts the plugin when qteConfig goes null,
//     ensuring clean teardown between QTE activations.
//   - Host controls lifecycle by setting/clearing qteConfig.
//
// UE ANALOGY: Ability System Component — activates the right
//   Gameplay Ability based on a tag, routes the result back.
// ============================================================

import CircleTimingQTEModule from "../modules/circleTimingQTE.js";

var CircleTimingQTE = CircleTimingQTEModule.CircleTimingQTE;

// ============================================================
// Plugin Registry
// ============================================================
// Each key is a type string that matches qteConfig.type.
// Each value is an object with:
//   component — the React component to mount
//
// To register a new QTE plugin, add it here. The component
// must accept: { config, onComplete, onRingResult? }

var PLUGIN_REGISTRY = {
    circle_timing: { component: CircleTimingQTE },
    // future: bar_sweep, rhythm, etc.
};

// ============================================================
// QTERunner Component
// ============================================================

function QTERunner(props) {
    var qteConfig = props.qteConfig;
    var onComplete = props.onComplete;
    var onRingResult = props.onRingResult;

    // Idle — render nothing
    if (!qteConfig) return null;

    // Lookup plugin
    var entry = PLUGIN_REGISTRY[qteConfig.type];
    if (!entry) {
        console.warn("[QTERunner] Unknown QTE type: " + qteConfig.type);
        return null;
    }

    var PluginComponent = entry.component;

    // Mount plugin — key on type + a config identity so React
    // unmounts/remounts cleanly if config changes between activations.
    // Using JSON.stringify on a small config is fine for key stability.
    var configKey = qteConfig.type + "_" + (qteConfig._key || 0);

    return (
        <PluginComponent
            key={configKey}
            config={qteConfig}
            onComplete={onComplete || function() {}}
            onRingResult={onRingResult || null}
        />
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var QTERunnerModule = {
    QTERunner: QTERunner,
    PLUGIN_REGISTRY: PLUGIN_REGISTRY,
};

export default QTERunnerModule;