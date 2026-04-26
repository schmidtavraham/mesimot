import TaskCard from './TaskCard.jsx';

export default function CategoryColumn({ category, tasks, onUpdate, onDelete }) {
  return (
    <section className="column">
      <header className="column-header">
        <h2>{category.label}</h2>
        <span className="column-count">{tasks.length}</span>
      </header>

      {tasks.length === 0 ? (
        <p className="column-empty">אין משימות בקטגוריה זו</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
