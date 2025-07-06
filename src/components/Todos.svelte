<script>
    import {onMount} from 'svelte';
    import {supabase, getCurrentUser} from '../lib/supabase';
    import {showError, showNotification} from '../lib/stores';

    let todos = [];
    let newTodo = '';
    let isLoading = false;
    let isAddingTodo = false;

    async function fetchTodos() {
        try {
            isLoading = true;
            const user = await getCurrentUser();
            if (!user) return;

            const {data, error} = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;
            todos = data || [];
        } catch (err) {
            console.error('Error fetching todos:', err);
            showError('Failed to load todos');
        } finally {
            isLoading = false;
        }
    }

    async function addTodo() {
        const todoText = newTodo.trim();
        if (!todoText) {
            showError('Please enter a task');
            return;
        }

        if (todoText.length > 500) {
            showError('Task is too long (max 500 characters)');
            return;
        }

        try {
            isAddingTodo = true;
            const user = await getCurrentUser();
            if (!user) return;

            const {data, error} = await supabase.from('todos').insert({
                user_id: user.id,
                text: todoText
            }).select();

            if (error) throw error;

            if (data && data[0]) {
                todos = [data[0], ...todos];
            }

            newTodo = '';
            showNotification('✅ Task added successfully!');
        } catch (err) {
            console.error('Error adding todo:', err);
            showError('Failed to add task');
        } finally {
            isAddingTodo = false;
        }
    }

    async function toggleTodo(todo) {
        try {
            const {error} = await supabase
                .from('todos')
                .update({completed: !todo.completed})
                .eq('id', todo.id);

            if (error) throw error;

            // Update local state
            todos = todos.map(t =>
                t.id === todo.id ? {...t, completed: !t.completed} : t
            );

            showNotification(todo.completed ? '↩️ Task reopened' : '✅ Task completed!');
        } catch (err) {
            console.error('Error toggling todo:', err);
            showError('Failed to update task');
        }
    }

    async function deleteTodo(id) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const {error} = await supabase
                .from('todos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            todos = todos.filter(t => t.id !== id);
            showNotification('🗑️ Task deleted');
        } catch (err) {
            console.error('Error deleting todo:', err);
            showError('Failed to delete task');
        }
    }

    async function incrementPomodoro(todo) {
        try {
            const {error} = await supabase
                .from('todos')
                .update({pomodoro_count: todo.pomodoro_count + 1})
                .eq('id', todo.id);

            if (error) throw error;

            // Update local state
            todos = todos.map(t =>
                t.id === todo.id ? {...t, pomodoro_count: t.pomodoro_count + 1} : t
            );

            showNotification('🍅 Pomodoro added!');
        } catch (err) {
            console.error('Error incrementing pomodoro:', err);
            showError('Failed to add pomodoro');
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addTodo();
        }
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    onMount(() => {
        fetchTodos();
    });

    let filter = 'all';

    $: filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true; // 'all' filter
    });
</script>

<div class="todos-container">
    <div class="todos-header">
        <div class="tabs">
            <button class:active={filter === 'all'} on:click={() => filter = 'all'}>
                All Tasks ({todos.length})
            </button>
            <button class:active={filter === 'active'} on:click={() => filter = 'active'}>
                Active ({todos.filter(t => !t.completed).length})
            </button>
            <button class:active={filter === 'completed'} on:click={() => filter = 'completed'}>
                Completed ({todos.filter(t => t.completed).length})
            </button>
        </div>
    </div>

    <div class="add-todo">
        <div class="input-container">
            <span class="icon">＋</span>
            <input
                    bind:value={newTodo}
                    placeholder="Add a new task..."
                    class="todo-input"
                    on:keypress={handleKeyPress}
                    disabled={isAddingTodo}
                    maxlength="500"
            >
            <button
                    on:click={addTodo}
                    class="add-btn"
                    disabled={isAddingTodo || !newTodo.trim()}
            >
                {isAddingTodo ? 'Brewing...' : 'Add'}
            </button>
        </div>
        <div class="char-counter">{newTodo.length}/500</div>
    </div>

    {#if isLoading}
        <div class="loading-state">
            <div class="coffee-cup">☕</div>
            <p>Brewing your tasks...</p>
        </div>
    {:else if filteredTodos.length === 0}
        <div class="empty-state">
            <div class="coffee-icon">🍃</div>
            <h3>{filter === 'completed' ? 'No completed tasks yet' : 'Your task list is empty'}</h3>
            <p>{filter === 'completed' ? 'Complete some tasks to see them here!' : 'Add your first task above ☕'}</p>
        </div>
    {:else}
        <div class="todos-list">
            {#each filteredTodos as todo (todo.id)}
                <div class:completed={todo.completed} class="todo-item">
                    <label class="todo-checkbox">
                        <input
                                type="checkbox"
                                checked={todo.completed}
                                on:change={() => toggleTodo(todo)}
                                class="checkbox"
                        >
                        <span class="checkmark"></span>
                        <span class="todo-text">{todo.text}</span>
                    </label>

                    <div class="todo-meta">
                        <span class="todo-date">📅 {formatDate(todo.created_at)}</span>
                        <button on:click={() => incrementPomodoro(todo)} class="pomodoro-btn">
                            🍅 {todo.pomodoro_count > 0 ? `×${todo.pomodoro_count}` : 'Add'}
                        </button>
                    </div>

                    <button on:click={() => deleteTodo(todo.id)} class="delete-btn">
                        🗑️
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .todos-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 0px 20px;
    }

    .todos-header {
        margin-bottom: 10px;
    }

    h2 {
        color: var(--text-primary);
        margin: 0 0 16px 0;
        font-size: 28px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 600;
        letter-spacing: -0.02em;
    }

    .tabs {
        display: flex;
        gap: 8px;
        margin-top: 20px;
        flex-wrap: wrap;
    }

    .tabs button {
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .tabs button:hover {
        background: rgba(255, 255, 255, 0.12);
    }

    .tabs button.active {
        background: rgba(0, 212, 255, 0.15);
        color: var(--neon-blue);
        border-color: rgba(0, 212, 255, 0.3);
    }

    .add-todo {
        margin-bottom: 32px;
    }

    .input-container {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 8px 16px;
        border: 1px solid var(--glass-border);
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .input-container:focus-within {
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .icon {
        font-size: 25px;
        margin-right: 8px;
        color: var(--neon-blue);
        opacity: 0.8;
    }

    .todo-input {
        flex: 1;
        padding: 12px 0;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 16px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .todo-input::placeholder {
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .todo-input:focus {
        outline: none;
    }

    .add-btn {
        padding: 10px 20px;
        background: rgba(0, 212, 255, 0.15);
        color: var(--neon-blue);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 15px;
        margin-left: 12px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .add-btn:hover:not(:disabled) {
        background: rgba(0, 212, 255, 0.2);
        transform: translateY(-2px);
    }

    .add-btn:disabled {
        border-color: rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        cursor: not-allowed;
        opacity: 0.5;
    }

    .char-counter {
        text-align: right;
        font-size: 13px;
        color: var(--text-secondary);
        margin-top: 8px;
    }

    .loading-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--neon-blue);
    }

    .terminal-icon {
        font-size: 48px;
        margin-bottom: 16px;
        animation: pulse 2s infinite;
    }

    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: var(--neon-blue);
        opacity: 0.7;
    }

    .empty-state h3 {
        color: var(--text-primary);
        margin: 0 0 12px 0;
        font-weight: 600;
    }

    .empty-state p {
        margin: 0;
        font-size: 15px;
    }

    .todos-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .todo-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        border: 1px solid var(--glass-border);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
    }

    .todo-item:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-4px);
        box-shadow: var(--glass-shadow);
    }

    .todo-item.completed {
        opacity: 0.6;
        border-color: rgba(255, 255, 255, 0.05);
    }

    .todo-checkbox {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
        cursor: pointer;
    }

    .checkbox {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
    }

    .checkmark {
        position: relative;
        height: 24px;
        width: 24px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .checkbox:checked ~ .checkmark {
        background: var(--neon-blue);
        border-color: var(--neon-blue);
    }

    .checkmark:after {
        content: "";
        position: absolute;
        display: none;
        left: 8px;
        top: 4px;
        width: 6px;
        height: 12px;
        border: solid var(--dark-bg);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }

    .checkbox:checked ~ .checkmark:after {
        display: block;
    }

    .todo-text {
        flex: 1;
        color: var(--text-primary);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 16px;
    }

    .todo-item.completed .todo-text {
        text-decoration: line-through;
        color: var(--text-secondary);
    }

    .todo-meta {
        display: flex;
        gap: 16px;
        align-items: center;
        font-size: 14px;
        color: var(--text-secondary);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .pomodoro-btn {
        background: rgba(0, 212, 255, 0.15);
        border: 1px solid rgba(0, 212, 255, 0.3);
        color: var(--neon-blue);
        border-radius: 16px;
        padding: 6px 12px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
        white-space: nowrap;
    }

    .pomodoro-btn:hover {
        background: rgba(0, 212, 255, 0.2);
    }

    .delete-btn {
        background: none;
        border: none;
        color: var(--accent-error);
        cursor: pointer;
        font-size: 20px;
        opacity: 0.7;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .delete-btn:hover {
        opacity: 1;
        background: rgba(255, 69, 58, 0.1);
    }

    @media (max-width: 768px) {
        .todo-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
        }

        .todo-meta {
            width: 100%;
            justify-content: space-between;
        }

        .delete-btn {
            align-self: flex-start;
        }
    }
</style>