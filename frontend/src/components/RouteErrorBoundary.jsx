import React from "react";

// A tab can retain an old lazy-module URL after a deployment. Never reload
// automatically: the user must decide when to abandon any unsaved input.
export default class RouteErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen bg-pe-canvas text-pe-text grid place-items-center p-6">
      <section role="alert" className="pe-card w-full max-w-lg p-6 space-y-4">
        <h1 className="text-xl font-bold">Impossible de charger cette page</h1>
        <p>Une mise à jour de PipsEvo ou un problème de connexion peut empêcher son affichage.</p>
        <p className="text-sm">Vérifie ta connexion, puis recharge la page. Les saisies non enregistrées peuvent être perdues.</p>
        <button type="button" className="btn-primary" onClick={() => {
          if (this.props.onReload) this.props.onReload();
          else window.location.reload();
        }}>Recharger la page</button>
      </section>
    </main>;
  }
}
