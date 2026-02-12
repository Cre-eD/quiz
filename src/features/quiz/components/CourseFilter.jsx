export default function CourseFilter({
  courses,
  courseFilter,
  setCourseFilter,
  courseNames,
  quizzes
}) {
  if (courses.length <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-slate-500 text-sm mr-2"><i className="fa fa-book mr-1"></i>Course:</span>
      <button
        onClick={() => setCourseFilter('all')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${courseFilter === 'all' ? 'bg-purple-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
      >
        All <span className="ml-1 text-xs opacity-70">{quizzes.length}</span>
      </button>
      {courses.map(course => (
        <button
          key={course}
          onClick={() => setCourseFilter(course)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${courseFilter === course ? 'bg-purple-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
        >
          {courseNames[course] || course} <span className="ml-1 text-xs opacity-70">{quizzes.filter(q => (q.course || 'default') === course).length}</span>
        </button>
      ))}
    </div>
  )
}
