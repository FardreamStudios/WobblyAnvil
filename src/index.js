import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// --- Dev tool routing (dev-only, stripped in prod) ---
var basePath = process.env.PUBLIC_URL || "";
var isDevRoute = window.location.pathname.replace(basePath, "").indexOf("/dev") === 0 && process.env.NODE_ENV === "development";
var RootComponent = App;

if (isDevRoute) {
    var DevRouter = require('./dev/DevRouter.js').default;
    RootComponent = DevRouter;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <RootComponent />
    </React.StrictMode>
);

reportWebVitals();