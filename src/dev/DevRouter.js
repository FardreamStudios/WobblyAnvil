// ============================================================
// DevRouter.js — Dev Tool Route Handler
// Maps /dev/* paths to dev tool components.
// Dev-only — never included in production builds.
//
// Adding a new dev tool:
//   1. Create src/dev/YourTool.js
//   2. Add a route entry below
//   3. Access at localhost:3000/dev/your-tool
// ============================================================

import HUDViewer from "./HUDViewer.js";
import ParticleEditor from "./ParticleEditor.js";

var DEV_ROUTES = {
    "/dev/hud-viewer": HUDViewer,
    "/dev/particle-editor": ParticleEditor,
};

function DevRouter() {
    var path = window.location.pathname;
    var Component = DEV_ROUTES[path];

    if (Component) {
        return <Component />;
    }

    // Dev index — list available tools
    return (
        <div style={{
            width: "100%", minHeight: "100vh",
            background: "#0a0704", color: "#f0e6c8",
            fontFamily: "'Josefin Sans', sans-serif",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 16,
        }}>
            <div style={{ fontSize: 18, color: "#f59e0b", letterSpacing: 4, fontWeight: "bold", fontFamily: "'Cinzel', serif" }}>
                DEV TOOLS
            </div>
            {Object.keys(DEV_ROUTES).map(function(route) {
                return (
                    <a key={route} href={route} style={{
                        color: "#60a5fa", fontSize: 13, letterSpacing: 2,
                        textDecoration: "none", padding: "6px 16px",
                        border: "1px solid #3d2e0f", borderRadius: 6,
                        background: "#141009",
                    }}>
                        {route}
                    </a>
                );
            })}
        </div>
    );
}

export default DevRouter;