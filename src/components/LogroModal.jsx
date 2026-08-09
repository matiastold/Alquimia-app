export default function LogroModal({ mensaje, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-8 text-center border-sage/30">
        <div className="text-4xl mb-4">🎉</div>
        <p className="font-display text-xl text-sage mb-6">{mensaje}</p>
        <button onClick={onCerrar} className="btn-primary w-full">
          ¡Genial!
        </button>
      </div>
    </div>
  )
}