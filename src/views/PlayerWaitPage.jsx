export default function PlayerWaitPage({ joinForm }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <div className="relative z-10">
        <div className="mb-8 animate-float">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <i className="fa fa-hourglass-half text-4xl animate-pulse"></i>
          </div>
        </div>
        <h2 className="text-5xl font-black gradient-text mb-4">You're in!</h2>
        <p className="text-2xl text-slate-300 mb-2">{joinForm.name}</p>
        <p className="text-slate-500 text-lg">Waiting for the host to start...</p>

        <div className="mt-8 flex gap-2 justify-center">
          <span className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }}></span>
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.1s' }}></span>
          <span className="w-3 h-3 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        </div>
      </div>
    </div>
  )
}
