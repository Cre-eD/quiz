import Spinner from '@/components/Spinner'

export default function QuizEditorPage({ user, isAdmin, setView, activeQuiz, setActiveQuiz, handleSave, saving, showToast }) {
  if (!user?.email || !isAdmin) { setView('home'); return null }

  return (
    <div className="min-h-screen pb-24">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <input
            className="bg-transparent text-4xl font-black border-b-2 border-slate-800 focus:border-blue-500 pb-2 outline-none flex-grow gradient-text"
            value={activeQuiz.title}
            onChange={e => setActiveQuiz({...activeQuiz, title: e.target.value})}
            placeholder="Quiz Title"
          />
          <button onClick={() => {navigator.clipboard.writeText(JSON.stringify(activeQuiz, null, 2)); showToast("JSON copied!");}} className="ml-4 text-slate-500 hover:text-blue-400">
            <i className="fa fa-copy mr-1"></i>Export
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {activeQuiz.questions.map((q, qIdx) => (
            <div key={qIdx} className="glass p-6 rounded-2xl space-y-4 relative animate-slide-up card-hover">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">{qIdx + 1}</span>
                <button onClick={() => {const qs = [...activeQuiz.questions]; qs.splice(qIdx, 1); setActiveQuiz({...activeQuiz, questions: qs});}} className="absolute top-4 right-4 text-slate-600 hover:text-red-500">
                  <i className="fa fa-trash"></i>
                </button>
              </div>
              <input
                className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none"
                placeholder="Enter your question..."
                value={q.text}
                onChange={e => {
                  const qs = [...activeQuiz.questions]
                  qs[qIdx].text = e.target.value
                  setActiveQuiz({...activeQuiz, questions: qs})
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="relative">
                    <input
                      className={`w-full p-3 pl-10 rounded-xl border-2 outline-none ${q.correct === oIdx ? 'border-green-500 bg-green-900/20' : 'border-slate-700 bg-slate-800/30 focus:border-slate-600'}`}
                      value={opt}
                      placeholder={`Option ${oIdx + 1}`}
                      onChange={e => {
                        const qs = [...activeQuiz.questions]
                        qs[qIdx].options[oIdx] = e.target.value
                        setActiveQuiz({...activeQuiz, questions: qs})
                      }}
                    />
                    <button
                      onClick={() => {
                        const qs = [...activeQuiz.questions]
                        qs[qIdx].correct = oIdx
                        setActiveQuiz({...activeQuiz, questions: qs})
                      }}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${q.correct === oIdx ? 'border-green-500 bg-green-500' : 'border-slate-600 hover:border-slate-500'}`}
                    >
                      {q.correct === oIdx && <i className="fa fa-check text-xs"></i>}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mb-3"><i className="fa fa-info-circle mr-1"></i>Click the circle to mark the correct answer</p>

              <div className="border-t border-slate-700 pt-4">
                <label className="text-sm text-slate-400 mb-2 block">
                  <i className="fa fa-lightbulb text-yellow-500 mr-2"></i>Explanation (shown after answer)
                </label>
                <textarea
                  className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-yellow-500 outline-none text-sm resize-none"
                  placeholder="Add a fun fact or explanation..."
                  rows={2}
                  value={q.explanation || ''}
                  onChange={e => {
                    const qs = [...activeQuiz.questions]
                    qs[qIdx].explanation = e.target.value
                    setActiveQuiz({...activeQuiz, questions: qs})
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setActiveQuiz({...activeQuiz, questions: [...activeQuiz.questions, {text: '', options:['','','',''], correct: 0, explanation: ''}]})} className="w-full py-5 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-blue-500 hover:text-blue-400">
          <i className="fa fa-plus mr-2"></i>Add Question
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 p-4">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button onClick={() => setView('dash')} className="flex-1 glass py-4 rounded-2xl font-bold hover:bg-slate-800">
            <i className="fa fa-times mr-2"></i>Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-[2] btn-gradient py-4 rounded-2xl font-bold text-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Spinner size="sm" /> Saving...</> : <><i className="fa fa-save mr-2"></i>Save Quiz</>}
          </button>
        </div>
      </div>
    </div>
  )
}
