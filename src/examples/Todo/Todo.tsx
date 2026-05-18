import { createSignal, For, Show } from "solid-js";
import { render } from "solid-js/web";
import { withDocHandle } from "../../core/withDocHandle";

export type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type TodoDoc = {
  todos: TodoItem[];
};

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const Todo = withDocHandle<TodoDoc>(({ element, handle }) => {
  const [doc, setDoc] = createSignal(handle.doc());
  const onChange = () => setDoc({ ...handle.doc() });
  handle.on("change", onChange);

  const [draft, setDraft] = createSignal("");

  const todos = () => doc().todos;
  const remaining = () => todos().filter((t) => !t.completed).length;

  const addTodo = () => {
    const text = draft().trim();
    if (!text) return;
    handle.change((d) => {
      d.todos.push({ id: newId(), text, completed: false });
    });
    setDraft("");
  };

  const toggleTodo = (id: string) => {
    handle.change((d) => {
      const t = d.todos.find((x) => x.id === id);
      if (t) t.completed = !t.completed;
    });
  };

  const removeTodo = (id: string) => {
    handle.change((d) => {
      const i = d.todos.findIndex((x) => x.id === id);
      if (i !== -1) d.todos.splice(i, 1);
    });
  };

  const clearCompleted = () => {
    handle.change((d) => {
      for (let i = d.todos.length - 1; i >= 0; i--) {
        if (d.todos[i].completed) d.todos.splice(i, 1);
      }
    });
  };

  const dispose = render(
    () => (
      <div class="todo">
        <form
          class="todo-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            addTodo();
          }}
        >
          <input
            class="todo-input"
            type="text"
            placeholder="What needs to be done?"
            value={draft()}
            onInput={(e) => setDraft(e.currentTarget.value)}
          />
          <button class="todo-add" type="submit" disabled={!draft().trim()}>
            Add
          </button>
        </form>

        <Show
          when={todos().length > 0}
          fallback={<p class="todo-empty">No todos yet — add one above.</p>}
        >
          <ul class="todo-list">
            <For each={todos()}>
              {(todo) => (
                <li class="todo-item" classList={{ completed: todo.completed }}>
                  <label class="todo-row">
                    <input
                      type="checkbox"
                      class="todo-check"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                    />
                    <span class="todo-text">{todo.text}</span>
                  </label>
                  <button
                    class="todo-remove"
                    type="button"
                    aria-label="Delete todo"
                    onClick={() => removeTodo(todo.id)}
                  >
                    ×
                  </button>
                </li>
              )}
            </For>
          </ul>

          <footer class="todo-footer">
            <span class="todo-count">
              {remaining()} {remaining() === 1 ? "item" : "items"} left
            </span>
            <Show when={todos().some((t) => t.completed)}>
              <button
                class="todo-clear"
                type="button"
                onClick={clearCompleted}
              >
                Clear completed
              </button>
            </Show>
          </footer>
        </Show>
      </div>
    ),
    element,
  );

  return () => {
    handle.off("change", onChange);
    dispose();
  };
});
