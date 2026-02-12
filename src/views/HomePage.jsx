import Spinner from '@/components/Spinner'
import { haptic } from '@/utils/haptic'

export default function HomePage({
  joinForm,
  setJoinForm,
  handleJoin,
  loading,
  isAdmin,
  setView,
  handleSignInWithGoogle
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="animate-float mb-4">
          <i className="fa fa-graduation-cap text-5xl text-blue-500"></i>
        </div>
        <h1 className="text-5xl font-black gradient-text mb-2">LectureQuiz</h1>
        <p className="text-slate-400 mb-10">Enter the game PIN to join</p>

        <div className="space-y-4 mb-4">
          <input
            type="text"
            inputMode="numeric"
            className="w-full glass p-6 rounded-2xl text-center text-5xl font-mono font-bold tracking-[0.3em] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-2xl indent-[0.15em]"
            placeholder="PIN"
            maxLength={4}
            value={joinForm.pin}
            onChange={e => setJoinForm({...joinForm, pin: e.target.value.replace(/\D/g, '')})}
          />
          <input
            className="w-full glass p-4 rounded-xl text-center text-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Your Nickname"
            maxLength={20}
            value={joinForm.name}
            onChange={e => setJoinForm({...joinForm, name: e.target.value})}
            onKeyDown={e => e.key === 'Enter' && joinForm.pin && joinForm.name && handleJoin()}
          />
        </div>

        <div className="glass rounded-xl p-3 mb-6 border border-yellow-500/30 text-left">
          <p className="text-yellow-500 text-sm flex items-start gap-2">
            <i className="fa fa-lightbulb mt-0.5"></i>
            <span><strong>Tip:</strong> Use the same nickname for all quizzes to track your total score on the leaderboard!</span>
          </p>
        </div>

        <button
          onClick={() => { haptic.medium(); handleJoin(); }}
          disabled={loading || !joinForm.pin || !joinForm.name.trim()}
          className="w-full btn-gradient py-5 rounded-2xl font-bold text-2xl disabled:opacity-50 flex items-center justify-center gap-3 mb-8"
        >
          {loading ? <><Spinner size="sm" /> Joining...</> : <><i className="fa fa-play"></i> Join Game</>}
        </button>

        <div className="pt-8 border-t border-slate-800">
          <button
            onClick={() => isAdmin ? setView('dash') : handleSignInWithGoogle()}
            disabled={loading}
            className="text-slate-500 hover:text-blue-400 transition-colors text-sm flex items-center justify-center gap-2 mx-auto"
          >
            <i className={`${isAdmin ? 'fa fa-chalkboard-teacher' : 'fab fa-google'}`}></i>
            {isAdmin ? 'Go to Teacher Dashboard' : "I'm a teacher"}
          </button>
        </div>
      </div>
    </div>
  )
}
