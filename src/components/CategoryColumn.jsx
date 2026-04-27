import TaskCard from './TaskCard.jsx';

export default function CategoryColumn({
  category,
  tasks,
  onUpdate,
  onDelete,
  draggingTask,
  onDragStart,
  onDragEnd,
  onDropOn,
}) {
  return (
    <section className="column" data-cat={category.value}>
      <header className="column-header">
        <h2>{category.label}</h2>
        <span className="column-count">{tasks.length}</span>
      </header>

      {tasks.length === 0 ? (
        <p className="column-empty">אין משימות בקטגוריה זו</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => {
            const isDragging = draggingTask?.id === task.id;
            const canDrop =
              !!draggingTask &&
              !isDragging &&
              draggingTask.category === task.category &&
              draggingTask.priority === task.priority;

            return (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDropOn={onDropOn}
                isDragging={isDragging}
                canDrop={canDrop}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
